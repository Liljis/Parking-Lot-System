import {
  createBooking,
  getUserBookings,
  getBookingById,
  confirmArrival,
  releaseBooking,
} from '../services/bookingService.js';
import { logger } from '../utils/logger.js';

export async function handleCreateBooking(req, res) {
  try {
    const { slot_id } = req.body;
    if (!slot_id) {
      return res.status(400).json({ error: 'Field "slot_id" is required.' });
    }

    const userId = req.user.id;
    const booking = await createBooking(userId, slot_id);
    return res.status(201).json({
      message: 'Slot reserved successfully. Please arrive and confirm with GPS within 15 minutes.',
      booking,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      logger.error('Unexpected error creating booking', { error: err.message });
      return res.status(500).json({ error: 'Internal server error while reserving slot' });
    }
    return res.status(status).json({ error: err.message });
  }
}

export async function handleGetMyBookings(req, res) {
  try {
    const userId = req.user.id;
    const bookings = await getUserBookings(userId);
    return res.json({ bookings });
  } catch (err) {
    logger.error('Error fetching user bookings', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
}

export async function handleGetBookingById(req, res) {
  try {
    const { id } = req.params;
    const booking = await getBookingById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    return res.json({ booking });
  } catch (err) {
    logger.error('Error fetching booking by id', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch booking' });
  }
}

export async function handleConfirmArrival(req, res) {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const userId = req.user.id;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'GPS coordinates "lat" and "lng" are required.' });
    }

    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);

    if (isNaN(numericLat) || isNaN(numericLng)) {
      return res.status(400).json({ error: 'GPS coordinates must be valid numbers.' });
    }

    const result = await confirmArrival(id, userId, { lat: numericLat, lng: numericLng });
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      logger.error('Unexpected error confirming arrival', { error: err.message });
      return res.status(500).json({ error: 'Internal server error confirming arrival' });
    }
    return res.status(status).json({
      error: err.message,
      ...(err.meta ? { details: err.meta } : {}),
    });
  }
}

export async function handleReleaseBooking(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await releaseBooking(id, userId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      logger.error('Unexpected error releasing booking', { error: err.message });
      return res.status(500).json({ error: 'Internal server error releasing slot' });
    }
    return res.status(status).json({ error: err.message });
  }
}
