import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { logger } from '../utils/logger.js';

/**
 * User Service
 *
 * Like a digital guestbook:
 * When someone arrives with their w3id ID card, we check if they are already in the book.
 * If yes, we update their details. If they are new, we give them a unique ID and write them in!
 */
export async function upsertUser({ w3id, name, email }) {
  // 1. Look up user by unique w3id
  const findResult = await query(
    'SELECT id, w3id, name, email, created_at FROM users WHERE w3id = $1',
    [w3id]
  );

  if (findResult.rowCount > 0) {
    const existing = findResult.rows[0];
    // Update name or email if changed
    if (existing.name !== name || existing.email !== email) {
      const updateResult = await query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, w3id, name, email, created_at',
        [name, email, existing.id]
      );
      logger.info('Updated existing user profile', { userId: existing.id });
      return updateResult.rows[0];
    }
    return existing;
  }

  // 2. Insert new user
  const newId = uuidv4();
  const insertResult = await query(
    'INSERT INTO users (id, w3id, name, email) VALUES ($1, $2, $3, $4) RETURNING id, w3id, name, email, created_at',
    [newId, w3id, name, email]
  );

  logger.info('Created new user from w3id login', { userId: newId });
  return insertResult.rows[0];
}

export async function getUserById(id) {
  const result = await query(
    'SELECT id, w3id, name, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
