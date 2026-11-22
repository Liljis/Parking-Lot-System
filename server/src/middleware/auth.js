import { logger } from '../utils/logger.js';

/**
 * requireAuth middleware
 * 
 * Think of this as the security guard standing in front of the parking lot gate.
 * If the user has a valid badge (an active login session), the guard lets them in.
 * If not, the guard stops them and says: "401 Unauthorized - Please log in first!"
 */
export function requireAuth(req, res, next) {
  const user = req.user || req.session?.user;

  if (!user) {
    logger.debug('Unauthorized access attempt intercepted by requireAuth middleware', {
      path: req.originalUrl,
      method: req.method,
    });
    return res.status(401).json({
      error: 'Authentication required. Please log in with your w3id.',
      code: 'UNAUTHORIZED',
    });
  }

  // Attach user to req object for convenience in downstream controllers
  req.user = user;
  next();
}
