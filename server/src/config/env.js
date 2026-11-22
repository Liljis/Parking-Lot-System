import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://127.0.0.1:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/parking_lot',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-secret-key-change-in-prod-min-32-chars',
  oidc: {
    issuer: process.env.OIDC_ISSUER || 'https://preprod.w3id.sso.ibm.com/isam/oidc/endpoint/amapp-runtime-oidcidp',
    clientId: process.env.OIDC_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.OIDC_CLIENT_SECRET || 'dummy-client-secret',
    callbackUrl: process.env.OIDC_CALLBACK_URL || 'http://127.0.0.1:5001/auth/callback',
  },
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true' || process.env.NODE_ENV !== 'production',
  parkingLot: {
    name: process.env.PARKING_LOT_NAME || 'HQ Tech Park - Lot A',
    lat: parseFloat(process.env.PARKING_LOT_LAT || '37.774929'),
    lng: parseFloat(process.env.PARKING_LOT_LNG || '-122.419416'),
    radiusMeters: parseFloat(process.env.PARKING_LOT_RADIUS_METERS || '150'),
  },
};
