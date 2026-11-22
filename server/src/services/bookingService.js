import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { query, withTransaction } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { isInsideParkingLot } from '../utils/gpsService.js';
import { config } from '../config/env.js';

const BOOKING_EXPIRY_MINUTES = 15;
const AUTO_RELEASE_HOURS = 12;
export const MAX_ACTIVE_BOOKINGS_PER_USER = 2;

/**
 * Creates a new booking within a DB transaction to prevent race conditions.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} slotId - Parking slot ID
 */
export async function createBooking(userId, slotId) {
  if (!validateUuid(slotId)) {
    const error = new Error('Invalid slot_id format. Must be a valid UUID.');
    error.status = 400;
    throw error;
  }

  return await withTransaction(async (client) => {
    // 1. Enforce max active booking quota per user (max 2 active slots)
    const activeCountRes = await client.query(
      "SELECT count(*) as count FROM bookings WHERE user_id = $1 AND status IN ('pending', 'confirmed')",
      [userId]
    );
    const activeCount = parseInt(activeCountRes.rows[0].count, 10);

    if (activeCount >= MAX_ACTIVE_BOOKINGS_PER_USER) {
      const error = new Error(
        `Reservation limit reached. You can only have a maximum of ${MAX_ACTIVE_BOOKINGS_PER_USER} active slot reservations at a time.`
      );
      error.status = 400;
      throw error;
    }

    // 2. Lock slot row and check availability
    const slotRes = await client.query(
      'SELECT id, slot_number, status, location_lat, location_lng FROM parking_slots WHERE id = $1 FOR UPDATE',
      [slotId]
    );

    if (slotRes.rowCount === 0) {
      const error = new Error('Parking slot does not exist.');
      error.status = 404;
      throw error;
    }

    const slot = slotRes.rows[0];
    if (slot.status !== 'available') {
      const error = new Error(`Slot ${slot.slot_number} is already ${slot.status}. Please choose another slot.`);
      error.status = 409;
      throw error;
    }

    // 2. Compute timestamps (Server-side timestamps only)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
    const bookingId = uuidv4();

    // 3. Insert new booking
    const insertRes = await client.query(
      `INSERT INTO bookings (id, user_id, slot_id, status, booked_at, expires_at)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING id, user_id, slot_id, status, booked_at, expires_at`,
      [bookingId, userId, slotId, now.toISOString(), expiresAt.toISOString()]
    );

    // 4. Update slot status to 'reserved'
    await client.query(
      "UPDATE parking_slots SET status = 'reserved' WHERE id = $1",
      [slotId]
    );

    logger.info('Created pending booking', { bookingId, slotId, userId });

    return {
      ...insertRes.rows[0],
      slot: {
        id: slot.id,
        slot_number: slot.slot_number,
        status: 'reserved',
        location_lat: parseFloat(slot.location_lat),
        location_lng: parseFloat(slot.location_lng),
      },
    };
  });
}

/**
 * Retrieves all bookings created by the given user.
 */
export async function getUserBookings(userId) {
  const sql = `
    SELECT 
      b.id,
      b.user_id,
      b.slot_id,
      b.status,
      b.booked_at,
      b.confirmed_at,
      b.released_at,
      b.expires_at,
      b.auto_release_at,
      ps.slot_number,
      ps.location_lat,
      ps.location_lng
    FROM bookings b
    JOIN parking_slots ps ON b.slot_id = ps.id
    WHERE b.user_id = $1
    ORDER BY b.booked_at DESC
  `;

  const result = await query(sql, [userId]);
  return result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    slot_id: row.slot_id,
    status: row.status,
    booked_at: row.booked_at,
    confirmed_at: row.confirmed_at,
    released_at: row.released_at,
    expires_at: row.expires_at,
    auto_release_at: row.auto_release_at,
    slot: {
      id: row.slot_id,
      slot_number: row.slot_number,
      location_lat: parseFloat(row.location_lat),
      location_lng: parseFloat(row.location_lng),
    },
  }));
}

/**
 * Retrieves a single booking by ID.
 */
export async function getBookingById(bookingId) {
  const sql = `
    SELECT 
      b.id,
      b.user_id,
      b.slot_id,
      b.status,
      b.booked_at,
      b.confirmed_at,
      b.released_at,
      b.expires_at,
      b.auto_release_at,
      ps.slot_number,
      ps.location_lat,
      ps.location_lng,
      u.name as user_name,
      u.email as user_email
    FROM bookings b
    JOIN parking_slots ps ON b.slot_id = ps.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = $1
  `;

  const result = await query(sql, [bookingId]);
  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    slot_id: row.slot_id,
    status: row.status,
    booked_at: row.booked_at,
    confirmed_at: row.confirmed_at,
    released_at: row.released_at,
    expires_at: row.expires_at,
    auto_release_at: row.auto_release_at,
    user: {
      name: row.user_name,
      email: row.user_email,
    },
    slot: {
      id: row.slot_id,
      slot_number: row.slot_number,
      location_lat: parseFloat(row.location_lat),
      location_lng: parseFloat(row.location_lng),
    },
  };
}

/**
 * Confirms arrival at the parking lot via GPS coordinates.
 */
export async function confirmArrival(bookingId, userId, { lat, lng }) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    const error = new Error('Valid lat and lng numeric coordinates are required.');
    error.status = 400;
    throw error;
  }

  return await withTransaction(async (client) => {
    // 1. Fetch booking with lock
    const bookingRes = await client.query(
      'SELECT id, user_id, slot_id, status, expires_at FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (bookingRes.rowCount === 0) {
      const error = new Error('Booking not found.');
      error.status = 404;
      throw error;
    }

    const booking = bookingRes.rows[0];

    // Check ownership
    if (booking.user_id !== userId) {
      const error = new Error('Forbidden: You can only confirm your own booking.');
      error.status = 403;
      throw error;
    }

    // Check status
    if (booking.status === 'confirmed') {
      const error = new Error('Booking is already confirmed.');
      error.status = 400;
      throw error;
    }

    if (booking.status !== 'pending') {
      const error = new Error(`Cannot confirm booking with status '${booking.status}'.`);
      error.status = 400;
      throw error;
    }

    // Check 15-minute expiry
    const now = new Date();
    if (new Date(booking.expires_at) <= now) {
      // Mark as expired
      await client.query("UPDATE bookings SET status = 'expired' WHERE id = $1", [bookingId]);
      await client.query("UPDATE parking_slots SET status = 'available' WHERE id = $1", [booking.slot_id]);
      const error = new Error('Booking has expired (15-minute confirmation window passed). Slot was released.');
      error.status = 410;
      throw error;
    }

    // 2. Validate GPS boundary
    const lotLat = config.parkingLot.lat;
    const lotLng = config.parkingLot.lng;
    const radiusMeters = config.parkingLot.radiusMeters;

    const { isInside, distanceMeters } = isInsideParkingLot(lat, lng, lotLat, lotLng, radiusMeters);

    if (!isInside) {
      const error = new Error(
        `GPS verification failed: You are ${distanceMeters}m away. Must be within ${radiusMeters}m of the parking lot.`
      );
      error.status = 403;
      error.meta = { distanceMeters, radiusMeters };
      throw error;
    }

    // 3. Confirm booking & activate slot
    const confirmedAt = now;
    const autoReleaseAt = new Date(now.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000);

    const updateRes = await client.query(
      `UPDATE bookings 
       SET status = 'confirmed', confirmed_at = $1, auto_release_at = $2 
       WHERE id = $3 
       RETURNING id, user_id, slot_id, status, booked_at, confirmed_at, auto_release_at`,
      [confirmedAt.toISOString(), autoReleaseAt.toISOString(), bookingId]
    );

    await client.query(
      "UPDATE parking_slots SET status = 'occupied' WHERE id = $1",
      [booking.slot_id]
    );

    logger.info('Booking confirmed via GPS', { bookingId, distanceMeters });

    return {
      ...updateRes.rows[0],
      distanceMeters,
      message: 'Arrival confirmed successfully! Parking slot is now activated.',
    };
  });
}

/**
 * Manually releases a confirmed slot when the user departs.
 */
export async function releaseBooking(bookingId, userId) {
  return await withTransaction(async (client) => {
    // 1. Fetch booking with lock
    const bookingRes = await client.query(
      'SELECT id, user_id, slot_id, status FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (bookingRes.rowCount === 0) {
      const error = new Error('Booking not found.');
      error.status = 404;
      throw error;
    }

    const booking = bookingRes.rows[0];

    // Check ownership
    if (booking.user_id !== userId) {
      const error = new Error('Forbidden: You can only release your own booking.');
      error.status = 403;
      throw error;
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      const error = new Error(`Cannot release booking with status '${booking.status}'.`);
      error.status = 400;
      throw error;
    }

    const now = new Date();

    // 2. Set booking to released and slot to available
    const updateRes = await client.query(
      `UPDATE bookings 
       SET status = 'released', released_at = $1 
       WHERE id = $2 
       RETURNING id, user_id, slot_id, status, booked_at, confirmed_at, released_at`,
      [now.toISOString(), bookingId]
    );

    await client.query(
      "UPDATE parking_slots SET status = 'available' WHERE id = $1",
      [booking.slot_id]
    );

    logger.info('Booking released by user', { bookingId, slotId: booking.slot_id });

    return {
      ...updateRes.rows[0],
      message: 'Slot released successfully. Thank you!',
    };
  });
}
