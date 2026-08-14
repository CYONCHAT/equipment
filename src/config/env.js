const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const asBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};
const asInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const csv = (value, fallback = []) => (value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : fallback);

module.exports = {
  serviceName: process.env.SERVICE_NAME || 'operaon-equipment',
  port: asInt(process.env.PORT, 4780),
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxyHops: asInt(process.env.TRUST_PROXY_HOPS, 1),
  cors: { origin: process.env.CORS_ORIGIN || '*' },
  serviceApiKey: process.env.SERVICE_API_KEY || 'local-equipment-service-key',
  jwt: {
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    secret: process.env.JWT_SECRET || 'local-equipment-jwt-secret-change-me',
    publicKey: process.env.JWT_PUBLIC_KEY || '',
    issuer: process.env.JWT_ISSUER || 'operaon-identity',
    audiences: csv(process.env.JWT_AUDIENCE, ['operaon-equipment']),
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: asInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'operaon_equipment',
    user: process.env.DB_USER || 'dbadmin',
    password: process.env.DB_PASSWORD || '',
    logging: asBool(process.env.DB_LOGGING, false),
    ssl: asBool(process.env.DB_SSL, false),
  },
  integration: {
    mode: process.env.INTEGRATION_MODE || 'live',
    requestTimeoutMs: asInt(process.env.INTEGRATION_TIMEOUT_MS, 5000),
    entitlementsUrl: process.env.ENTITLEMENTS_SERVICE_URL || 'http://localhost:4770',
    catalogUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:4750',
    agendUrl: process.env.AGEND_SERVICE_URL || 'http://localhost:4720',
    billingUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:4765',
    payUrl: process.env.PAY_SERVICE_URL || 'http://localhost:4601',
    serviceKey: process.env.INTEGRATION_SERVICE_KEY || process.env.SERVICE_API_KEY || 'local-equipment-service-key',
  },
  rental: {
    minimumBillingMinutes: asInt(process.env.RENTAL_MINIMUM_BILLING_MINUTES, 15),
    overtimeRoundingMinutes: asInt(process.env.RENTAL_OVERTIME_ROUNDING_MINUTES, 15),
    checkInGraceMinutes: asInt(process.env.RENTAL_CHECKIN_GRACE_MINUTES, 15),
    maxOpenSessionHours: asInt(process.env.RENTAL_MAX_OPEN_SESSION_HOURS, 24),
  },
};
