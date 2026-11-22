import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, initDbPool } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let migrationsRun = false;

export async function runMigrations() {
  if (migrationsRun) {
    logger.debug('Migrations already executed in current process.');
    return;
  }

  logger.info('Running database migrations...');
  await initDbPool();

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Split on semicolons for clean execution across drivers
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await query(statement);
  }

  migrationsRun = true;
  logger.info('Database migrations completed successfully');
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      logger.info('Migration finished');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed', { error: err.message });
      process.exit(1);
    });
}
