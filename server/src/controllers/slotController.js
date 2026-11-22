import { getAllSlots, getSlotById } from '../services/slotService.js';
import { logger } from '../utils/logger.js';

export async function listSlots(req, res) {
  try {
    const { status } = req.query;
    const slots = await getAllSlots(status);
    return res.json({
      slots,
      total: slots.length,
      availableCount: slots.filter((s) => s.status === 'available').length,
      reservedCount: slots.filter((s) => s.status === 'reserved').length,
      occupiedCount: slots.filter((s) => s.status === 'occupied').length,
    });
  } catch (err) {
    logger.error('Failed to retrieve parking slots', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve parking slots' });
  }
}

export async function getSlot(req, res) {
  try {
    const { id } = req.params;
    const slot = await getSlotById(id);
    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }
    return res.json({ slot });
  } catch (err) {
    logger.error('Failed to retrieve parking slot', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve parking slot' });
  }
}
