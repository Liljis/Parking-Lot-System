import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { setupOidc, authRouter } from './routes/authRoutes.js';
import { slotRouter } from './routes/slotRoutes.js';
import { bookingRouter } from './routes/bookingRoutes.js';
import { logger } from './utils/logger.js';

export async function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite React SPA in dev
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration (Principle of least privilege)
  app.use(
    cors({
      origin: [config.clientUrl, 'http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // 4. Session management with secure cookie settings
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.isProduction, // HTTPS in production
        sameSite: config.isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // 5. Passport OIDC initialization
  app.use(passport.initialize());
  app.use(passport.session());
  await setupOidc();

  // 6. Request logging
  app.use((req, res, next) => {
    logger.debug('HTTP Request', {
      method: req.method,
      path: req.path,
    });
    next();
  });

  // 7. Health & Info Endpoints
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'parking-lot-system-api',
      timestamp: new Date().toISOString(),
      lot: {
        name: config.parkingLot.name,
        lat: config.parkingLot.lat,
        lng: config.parkingLot.lng,
        radiusMeters: config.parkingLot.radiusMeters,
      },
    });
  });

  // 8. Mount Modular Routes
  app.use('/auth', authRouter);
  app.use('/api/slots', slotRouter);
  app.use('/api/bookings', bookingRouter);

  // 9. 404 Handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // 10. Centralized Error Handler (No stack traces to clients)
  app.use((err, req, res, next) => {
    logger.error('Unhandled request error', {
      error: err.message,
      path: req.originalUrl,
      method: req.method,
    });
    const status = err.status || 500;
    res.status(status).json({
      error: config.isProduction ? 'An unexpected server error occurred' : err.message,
    });
  });

  return app;
}
