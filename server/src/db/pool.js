import pg from 'pg';
import { newDb } from 'pg-mem';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool = null;
let isMemDb = false;
let memDbInstance = null;

function createMemoryDbPool() {
  const db = newDb();
  // Register gen_random_uuid() or uuid functions if needed
  db.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }),
  });
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16.0 (pg-mem)',
  });
  memDbInstance = db;
  const adapter = db.adapters.createPg();
  isMemDb = true;
  return new adapter.Pool();
}

export async function initDbPool() {
  if (pool) return pool;

  if (process.env.USE_MEM_DB === 'true') {
    logger.info('Initializing in-memory PostgreSQL database (USE_MEM_DB=true)');
    pool = createMemoryDbPool();
    return pool;
  }

  try {
    const candidatePool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 10000,
      max: 20,
    });

    // Test connection
    const client = await candidatePool.connect();
    await client.query('SELECT 1');
    client.release();
    pool = candidatePool;
    isMemDb = false;
    logger.info('Connected to PostgreSQL database');
    return pool;
  } catch (err) {
    if (config.nodeEnv !== 'production') {
      logger.warn(`PostgreSQL connection failed at ${config.databaseUrl}. Falling back to in-memory PostgreSQL for development/testing: ${err.message}`);
      pool = createMemoryDbPool();
      return pool;
    }
    logger.error('Failed to connect to PostgreSQL database in production', { error: err.message });
    throw err;
  }
}

export async function getPool() {
  if (!pool) {
    await initDbPool();
  }
  return pool;
}

export async function query(text, params = []) {
  const p = await getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rowCount: res.rowCount });
    return res;
  } catch (err) {
    logger.error('Query execution error', { text, error: err.message });
    throw err;
  }
}

export async function withTransaction(callback) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function isUsingMemoryDb() {
  return isMemDb;
}

export function getMemoryDbInstance() {
  return memDbInstance;
}
