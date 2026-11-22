import { v4 as uuidv4 } from 'uuid';
import { query, initDbPool } from './pool.js';
import { runMigrations } from './migrate.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function runSeeds() {
  logger.info('Seeding database...');
  await initDbPool();
  await runMigrations();

  // Seed sample user if not exists
  const sampleUserId = '00000000-0000-0000-0000-000000000001';
  const existingUser = await query('SELECT id FROM users WHERE id = $1', [sampleUserId]);
  if (existingUser.rowCount === 0) {
    await query(
      `INSERT INTO users (id, w3id, name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (w3id) DO NOTHING`,
      [sampleUserId, 'W3ID-DEMO-001', 'Demo Employee', 'demo.employee@ibm.com']
    );
    logger.info('Seeded demo user');
  }

  // Seed 20 parking slots (A-01 through A-10, B-01 through B-10)
  const baseLat = config.parkingLot.lat;
  const baseLng = config.parkingLot.lng;

  const existingSlots = await query('SELECT count(*) as count FROM parking_slots');
  const count = parseInt(existingSlots.rows[0].count, 10);

  if (count === 0) {
    const slots = [];
    // Zone A (Rows 1-10)
    for (let i = 1; i <= 10; i++) {
      const num = i < 10 ? `0${i}` : `${i}`;
      // Small offset in lat/lng (~10-50 meters)
      const latOffset = (i - 5) * 0.00008;
      const lngOffset = 0.00005;
      slots.push({
        id: uuidv4(),
        slot_number: `A-${num}`,
        status: 'available',
        location_lat: parseFloat((baseLat + latOffset).toFixed(6)),
        location_lng: parseFloat((baseLng + lngOffset).toFixed(6)),
      });
    }

    // Zone B (Rows 1-10)
    for (let i = 1; i <= 10; i++) {
      const num = i < 10 ? `0${i}` : `${i}`;
      const latOffset = (i - 5) * 0.00008;
      const lngOffset = -0.00005;
      slots.push({
        id: uuidv4(),
        slot_number: `B-${num}`,
        status: 'available',
        location_lat: parseFloat((baseLat + latOffset).toFixed(6)),
        location_lng: parseFloat((baseLng + lngOffset).toFixed(6)),
      });
    }

    for (const slot of slots) {
      await query(
        `INSERT INTO parking_slots (id, slot_number, status, location_lat, location_lng)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slot_number) DO NOTHING`,
        [slot.id, slot.slot_number, slot.status, slot.location_lat, slot.location_lng]
      );
    }
    logger.info(`Seeded ${slots.length} parking slots`);
  } else {
    logger.info(`Parking slots already exist (${count} slots found)`);
  }
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeeds()
    .then(() => {
      logger.info('Database seeding completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Database seeding failed', { error: err.message });
      process.exit(1);
    });
}
