import cron from 'node-cron';
import { query, withTransaction } from '../db/pool.js';
import { logger } from '../utils/logger.js';

/**
 * Background Scheduler
 *
 * Like a digital parking lot warden:
 * Job 1: Checks every 1 minute for people who booked a spot but never showed up in 15 minutes (no-shows).
 *        Frees up their slot so other people can park.
 * Job 2: Checks every 5 minutes for cars that have stayed over 12 hours.
 *        Auto-releases the slot to keep the parking lot running smoothly.
 */

export async function processExpiredBookings() {
  const now = new Date().toISOString();
  try {
    const result = await withTransaction(async (client) => {
      // Find all pending bookings that are past expires_at
      const findRes = await client.query(
        "SELECT id, slot_id FROM bookings WHERE status = 'pending' AND expires_at <= $1",
        [now]
      );

      if (findRes.rowCount === 0) {
        return { expiredCount: 0 };
      }

      const bookingIds = findRes.rows.map((r) => r.id);
      const slotIds = findRes.rows.map((r) => r.slot_id);

      // Bulk update bookings to 'expired'
      await client.query(
        "UPDATE bookings SET status = 'expired' WHERE id = ANY($1::uuid[])",
        [bookingIds]
      );

      // Bulk update slots to 'available'
      await client.query(
        "UPDATE parking_slots SET status = 'available' WHERE id = ANY($1::uuid[])",
        [slotIds]
      );

      return { expiredCount: findRes.rowCount };
    });

    if (result.expiredCount > 0) {
      logger.info('Scheduler expired overdue pending bookings', {
        count: result.expiredCount,
      });
    }
    return result;
  } catch (err) {
    logger.error('Error processing expired bookings in scheduler', { error: err.message });
  }
}

export async function processAutoReleaseBookings() {
  const now = new Date().toISOString();
  try {
    const result = await withTransaction(async (client) => {
      // Find all confirmed bookings past auto_release_at (12 hrs)
      const findRes = await client.query(
        "SELECT id, slot_id FROM bookings WHERE status = 'confirmed' AND auto_release_at IS NOT NULL AND auto_release_at <= $1",
        [now]
      );

      if (findRes.rowCount === 0) {
        return { releasedCount: 0 };
      }

      const bookingIds = findRes.rows.map((r) => r.id);
      const slotIds = findRes.rows.map((r) => r.slot_id);

      // Bulk update bookings to 'released'
      await client.query(
        "UPDATE bookings SET status = 'released', released_at = $1 WHERE id = ANY($2::uuid[])",
        [now, bookingIds]
      );

      // Bulk update slots to 'available'
      await client.query(
        "UPDATE parking_slots SET status = 'available' WHERE id = ANY($1::uuid[])",
        [slotIds]
      );

      return { releasedCount: findRes.rowCount };
    });

    if (result.releasedCount > 0) {
      logger.info('Scheduler auto-released 12-hour overstay bookings', {
        count: result.releasedCount,
      });
    }
    return result;
  } catch (err) {
    logger.error('Error processing auto-release bookings in scheduler', { error: err.message });
  }
}

let noShowJob = null;
let autoReleaseJob = null;

export function startScheduler() {
  logger.info('Starting background cron scheduler');

  // Job 1: Every 1 minute ('* * * * *')
  noShowJob = cron.schedule('* * * * *', async () => {
    logger.debug('Running 1-minute no-show expiry check');
    await processExpiredBookings();
  });

  // Job 2: Every 5 minutes ('*/5 * * * *')
  autoReleaseJob = cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running 5-minute 12-hour auto-release check');
    await processAutoReleaseBookings();
  });

  return { noShowJob, autoReleaseJob };
}

export function stopScheduler() {
  if (noShowJob) noShowJob.stop();
  if (autoReleaseJob) autoReleaseJob.stop();
  logger.info('Stopped background cron scheduler');
}
