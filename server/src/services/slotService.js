import { query } from '../db/pool.js';
import { logger } from '../utils/logger.js';

/**
 * Slot Service
 *
 * Provides real-time parking slot availability and active booking details.
 */
export async function getAllSlots(statusFilter = null) {
  let sql = `
    SELECT 
      ps.id,
      ps.slot_number,
      ps.status,
      ps.location_lat,
      ps.location_lng,
      ps.created_at,
      b.id AS active_booking_id,
      b.user_id AS active_user_id,
      b.status AS active_booking_status,
      b.booked_at AS active_booked_at,
      b.expires_at AS active_expires_at,
      b.confirmed_at AS active_confirmed_at,
      b.auto_release_at AS active_auto_release_at,
      u.name AS active_user_name
    FROM parking_slots ps
    LEFT JOIN bookings b ON ps.id = b.slot_id AND b.status IN ('pending', 'confirmed')
    LEFT JOIN users u ON b.user_id = u.id
  `;

  const params = [];
  if (statusFilter && ['available', 'reserved', 'occupied'].includes(statusFilter)) {
    sql += ' WHERE ps.status = $1';
    params.push(statusFilter);
  }

  sql += ' ORDER BY ps.slot_number ASC';

  const result = await query(sql, params);
  return result.rows.map((row) => ({
    id: row.id,
    slot_number: row.slot_number,
    status: row.status,
    location_lat: parseFloat(row.location_lat),
    location_lng: parseFloat(row.location_lng),
    created_at: row.created_at,
    active_booking: row.active_booking_id
      ? {
          id: row.active_booking_id,
          user_id: row.active_user_id,
          user_name: row.active_user_name,
          status: row.active_booking_status,
          booked_at: row.active_booked_at,
          expires_at: row.active_expires_at,
          confirmed_at: row.active_confirmed_at,
          auto_release_at: row.active_auto_release_at,
        }
      : null,
  }));
}

export async function getSlotById(id) {
  const result = await query(
    'SELECT id, slot_number, status, location_lat, location_lng, created_at FROM parking_slots WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
