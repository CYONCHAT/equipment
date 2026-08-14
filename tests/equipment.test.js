process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'operaon_equipment_test';
process.env.INTEGRATION_MODE = 'mock';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const env = require('../src/config/env');

const tenantId = '11111111-1111-4111-8111-111111111111';
const organizationId = '22222222-2222-4222-8222-222222222222';
const entitlementId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const contractSourceId = 'catalog-sale-equipment-001';

const token = jwt.sign({ sub: userId, tenantId, organizationId, permissions: ['equipment:read', 'equipment:write', 'equipment:admin'], tokenType: 'access' }, env.jwt.secret, { algorithm: 'HS256', issuer: env.jwt.issuer, audience: 'operaon-api', expiresIn: '1h' });
const auth = (agent) => agent.set('X-Service-Key', env.serviceApiKey).set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId).set('X-Organization-Id', organizationId);

let asset;
let contract;
let reservation;
let session;

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.query('TRUNCATE TABLE equipment_maintenance_orders, equipment_inspections, rental_usage_records, rental_sessions, equipment_reservations, rental_contracts, equipment_assets RESTART IDENTITY CASCADE');
});
afterAll(async () => { await sequelize.close(); });

test('health check não exige autenticação', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
});

test('cria ativo e expõe QR Code estável por número de série', async () => {
  const response = await auth(request(app).post('/api/equipment/assets')).send({ serialNumber: 'VEL-EQ-0001', name: 'Máquina de reabilitação', collectionPointId: 'PONTO-01' });
  expect(response.status).toBe(201);
  asset = response.body.data;
  expect(asset.qrPublicToken).toHaveLength(48);
  const qr = await auth(request(app).get(`/api/equipment/assets/${asset.id}/qr`));
  expect(qr.status).toBe(200);
  expect(qr.body.data.serialNumber).toBe('VEL-EQ-0001');
  const image = await auth(request(app).get(`/api/equipment/assets/${asset.id}/qr.png`));
  expect(image.status).toBe(200);
  expect(image.headers['content-type']).toMatch(/image\/png/);
  expect(image.body.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});

test('cria contrato, reserva e faz check-in usando o QR Code', async () => {
  const contractResponse = await auth(request(app).post('/api/equipment/contracts')).send({ entitlementId, sourceSystem: 'catalog', sourceId: contractSourceId, mode: 'PREPAID', includedMinutes: 60, maxSessions: 3, overtimeRateCents: 1200, validFrom: '2026-08-14T00:00:00.000Z' });
  expect(contractResponse.status).toBe(201);
  contract = contractResponse.body.data;
  const reservationResponse = await auth(request(app).post('/api/equipment/reservations')).set('Idempotency-Key', 'reservation-001').send({ contractId: contract.id, assetId: asset.id, collectionPointId: 'PONTO-01', scheduledStart: '2026-08-14T10:00:00.000Z', scheduledEnd: '2026-08-14T12:00:00.000Z' });
  expect(reservationResponse.status).toBe(201);
  reservation = reservationResponse.body.data;
  const replay = await auth(request(app).post('/api/equipment/reservations')).set('Idempotency-Key', 'reservation-001').send({ contractId: contract.id, assetId: asset.id, collectionPointId: 'PONTO-01', scheduledStart: '2026-08-14T10:00:00.000Z', scheduledEnd: '2026-08-14T12:00:00.000Z' });
  expect(replay.status).toBe(201);
  expect(replay.body.idempotent).toBe(true);
  expect(replay.body.data.id).toBe(reservation.id);
  const conflict = await auth(request(app).post('/api/equipment/reservations')).set('Idempotency-Key', 'reservation-overlap').send({ contractId: contract.id, assetId: asset.id, collectionPointId: 'PONTO-01', scheduledStart: '2026-08-14T10:30:00.000Z', scheduledEnd: '2026-08-14T11:30:00.000Z' });
  expect(conflict.status).toBe(409);
  expect(conflict.body.error.code).toBe('ASSET_RESERVATION_CONFLICT');
  const checkInResponse = await auth(request(app).post('/api/equipment/sessions/check-in')).set('Idempotency-Key', 'checkin-001').send({ contractId: contract.id, reservationId: reservation.id, serialNumber: asset.serialNumber, qrPublicToken: asset.qrPublicToken, pickupAt: '2026-08-14T10:00:00.000Z', collectionPointId: 'PONTO-01' });
  expect(checkInResponse.status).toBe(201);
  session = checkInResponse.body.data;
  expect(session.status).toBe('CHECKED_OUT');
});

test('faz check-out, debita sessão e calcula excedente cobrável', async () => {
  const response = await auth(request(app).post(`/api/equipment/sessions/${session.id}/check-out`)).set('Idempotency-Key', 'checkout-001').send({ qrPublicToken: asset.qrPublicToken, returnAt: '2026-08-14T12:00:00.000Z', returnCollectionPointId: 'PONTO-01', inspection: { condition: 'OK' } });
  expect(response.status).toBe(200);
  expect(response.body.data.status).toBe('COMPLETED');
  expect(response.body.data.usedMinutes).toBe(120);
  expect(response.body.data.overageMinutes).toBe(60);
  expect(response.body.data.overageAmountCents).toBe(1200);
  expect(response.body.hasDebt).toBe(false);
});

test('bloqueia ativo durante manutenção e libera após conclusão', async () => {
  const create = await auth(request(app).post('/api/equipment/maintenance/orders')).send({ assetId: asset.id, type: 'PREVENTIVE', description: 'Revisão após locação', priority: 'MEDIUM' });
  expect(create.status).toBe(201);
  const start = await auth(request(app).post(`/api/equipment/maintenance/orders/${create.body.data.id}/start`)).send({});
  expect(start.status).toBe(200);
  const complete = await auth(request(app).post(`/api/equipment/maintenance/orders/${create.body.data.id}/complete`)).send({});
  expect(complete.status).toBe(200);
  const assetResponse = await auth(request(app).get(`/api/equipment/assets/${asset.id}`));
  expect(assetResponse.body.data.status).toBe('OPERATIONAL');
});

test('recusa acesso sem credencial dual ou permissão dinâmica', async () => {
  const missingServiceKey = await request(app).get('/api/equipment/assets').set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId);
  expect(missingServiceKey.status).toBe(401);
  const readOnly = jwt.sign({ sub: userId, tenantId, permissions: ['equipment:read'], tokenType: 'access' }, env.jwt.secret, { algorithm: 'HS256', issuer: env.jwt.issuer, audience: 'operaon-api', expiresIn: '1h' });
  const denied = await request(app).post('/api/equipment/assets').set('X-Service-Key', env.serviceApiKey).set('Authorization', `Bearer ${readOnly}`).set('X-Tenant-Id', tenantId).send({ serialNumber: 'VEL-EQ-0002', name: 'Outra máquina' });
  expect(denied.status).toBe(403);
});
