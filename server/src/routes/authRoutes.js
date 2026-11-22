import express from 'express';
import { Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import { config } from '../config/env.js';
import { upsertUser, getUserById } from '../services/userService.js';
import { logger } from '../utils/logger.js';

export const authRouter = express.Router();

let oidcClient = null;

export async function setupOidc() {
  if (config.oidc.clientId && config.oidc.clientId !== 'dummy-client-id') {
    try {
      const issuer = await Issuer.discover(config.oidc.issuer);
      oidcClient = new issuer.Client({
        client_id: config.oidc.clientId,
        client_secret: config.oidc.clientSecret,
        redirect_uris: [config.oidc.callbackUrl],
        response_types: ['code'],
      });

      passport.use(
        'oidc',
        new Strategy(
          {
            client: oidcClient,
            params: {
              scope: 'openid profile email',
            },
          },
          async (tokenSet, userinfo, done) => {
            try {
              const user = await upsertUser({
                w3id: userinfo.sub || userinfo.email || userinfo.preferred_username,
                name: userinfo.name || userinfo.given_name || 'IBM Employee',
                email: userinfo.email || `${userinfo.sub}@ibm.com`,
              });
              return done(null, user);
            } catch (err) {
              logger.error('Error during OIDC user upsert', { error: err.message });
              return done(err);
            }
          }
        )
      );
      logger.info('w3id OIDC Strategy configured successfully');
    } catch (err) {
      logger.warn(`Failed to connect to OIDC Issuer (${config.oidc.issuer}): ${err.message}. Local dev mock login will be active.`);
    }
  } else {
    logger.info('OIDC Client ID not specified. Local Dev Auth is active.');
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}

/**
 * GET /auth/login
 * Starts the OIDC login flow. If in local dev mode, redirects directly or offers quick demo switch.
 */
authRouter.get('/login', (req, res, next) => {
  if (oidcClient) {
    return passport.authenticate('oidc')(req, res, next);
  }

  if (config.devAuthEnabled) {
    // Redirect to dev login or auto-login demo user in dev
    return res.redirect(`${config.clientUrl}/login?mode=dev`);
  }

  return res.status(500).json({ error: 'OIDC provider is not configured.' });
});

/**
 * GET /auth/callback
 * OIDC Provider callback
 */
authRouter.get('/callback', (req, res, next) => {
  if (!oidcClient) {
    return res.redirect(`${config.clientUrl}/login`);
  }

  passport.authenticate('oidc', {
    failureRedirect: `${config.clientUrl}/login?error=auth_failed`,
  })(req, res, () => {
    req.session.user = req.user;
    res.redirect(`${config.clientUrl}/slots`);
  });
});

/**
 * POST /auth/dev-login
 * Instant simulated login for local development / testing
 */
authRouter.post('/dev-login', async (req, res) => {
  if (!config.devAuthEnabled) {
    return res.status(403).json({ error: 'Dev auth is disabled in production.' });
  }

  const { w3id = 'W3ID-DEMO-001', name = 'Demo Employee', email = 'demo.employee@ibm.com' } = req.body || {};

  try {
    const user = await upsertUser({ w3id, name, email });
    req.session.user = user;
    req.user = user;
    logger.info('User logged in via dev-login', { userId: user.id });

    return res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        w3id: user.w3id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    logger.error('Dev login failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * GET /auth/me
 * Returns current authenticated user session
 */
authRouter.get('/me', (req, res) => {
  const user = req.user || req.session?.user;
  if (!user) {
    return res.status(401).json({ authenticated: false, user: null });
  }

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      w3id: user.w3id,
      name: user.name,
      email: user.email,
    },
  });
});

/**
 * GET or POST /auth/logout
 * Destroys session
 */
const handleLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session during logout', { error: err.message });
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    if (req.method === 'GET' && req.accepts('html')) {
      return res.redirect(`${config.clientUrl}/login`);
    }
    return res.json({ message: 'Logged out successfully' });
  });
};

authRouter.get('/logout', handleLogout);
authRouter.post('/logout', handleLogout);
