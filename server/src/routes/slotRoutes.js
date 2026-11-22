import express from 'express';
import { listSlots, getSlot } from '../controllers/slotController.js';
import { requireAuth } from '../middleware/auth.js';

export const slotRouter = express.Router();

// GET /api/slots (Protected by requireAuth)
slotRouter.get('/', requireAuth, listSlots);

// GET /api/slots/:id (Protected by requireAuth)
slotRouter.get('/:id', requireAuth, getSlot);
