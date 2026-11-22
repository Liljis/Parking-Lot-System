import express from 'express';
import {
  handleCreateBooking,
  handleGetMyBookings,
  handleGetBookingById,
  handleConfirmArrival,
  handleReleaseBooking,
} from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/auth.js';

export const bookingRouter = express.Router();

// All booking routes require authentication
bookingRouter.use(requireAuth);

// POST /api/bookings - Reserve a slot
bookingRouter.post('/', handleCreateBooking);

// GET /api/bookings/my - List current user's bookings
bookingRouter.get('/my', handleGetMyBookings);

// GET /api/bookings/:id - Single booking details
bookingRouter.get('/:id', handleGetBookingById);

// POST /api/bookings/:id/confirm - GPS arrival confirm
bookingRouter.post('/:id/confirm', handleConfirmArrival);

// POST /api/bookings/:id/release - Manually free slot when leaving
bookingRouter.post('/:id/release', handleReleaseBooking);
