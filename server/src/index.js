import { createApp } from './app.js';
import { config } from './config/env.js';
import { initDbPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seed.js';
import { startScheduler } from './scheduler/cronJobs.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info('Initializing Parking Lot System server...');

    // 1. Initialize DB and run migrations & seed data
    await initDbPool();
    await runMigrations();
    await runSeeds();

    // 2. Start Cron Jobs
    startScheduler();

    // 3. Create Express App
    const app = await createApp();

    // 4. Bind server to 127.0.0.1 (strict security rule: never 0.0.0.0)
    const server = app.listen(config.port, config.host, () => {
      logger.info(`Server is listening on http://${config.host}:${config.port}`, {
        environment: config.nodeEnv,
        parkingLot: config.parkingLot.name,
      });
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
