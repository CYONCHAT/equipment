const crypto = require('crypto');
const env = require('../config/env');
const { fetchJson } = require('./integrationClient');

const mockId = () => crypto.randomUUID();
const unwrap = (payload) => payload?.data || payload;

const entitlements = {
  async issue({ payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { entitlement: { id: payload.entitlementId || mockId(), totalCredits: payload.totalCredits }, movement: { id: mockId() }, idempotent: false };
    const result = unwrap(await fetchJson(env.integration.entitlementsUrl, '/api/internal/entitlements/issue', { method: 'POST', body: payload, context, idempotencyKey }));
    return result;
  },
  async reserve({ entitlementId, payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { entitlement: { id: entitlementId }, movement: { id: mockId(), type: 'RESERVE' }, idempotent: false };
    return unwrap(await fetchJson(env.integration.entitlementsUrl, `/api/internal/entitlements/${entitlementId}/reserve`, { method: 'POST', body: payload, context, idempotencyKey }));
  },
  async release({ entitlementId, payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { entitlement: { id: entitlementId }, movement: { id: mockId(), type: 'RELEASE' }, idempotent: false };
    return unwrap(await fetchJson(env.integration.entitlementsUrl, `/api/internal/entitlements/${entitlementId}/release`, { method: 'POST', body: payload, context, idempotencyKey }));
  },
  async consume({ entitlementId, payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { entitlement: { id: entitlementId }, movement: { id: mockId(), type: 'CONSUME' }, idempotent: false };
    return unwrap(await fetchJson(env.integration.entitlementsUrl, `/api/internal/entitlements/${entitlementId}/consume`, { method: 'POST', body: { ...payload, type: 'COMPLETE_CONSUME' }, context, idempotencyKey }));
  },
  async refund({ entitlementId, payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { entitlement: { id: entitlementId }, movement: { id: mockId(), type: 'REFUND' }, idempotent: false };
    return unwrap(await fetchJson(env.integration.entitlementsUrl, `/api/internal/entitlements/${entitlementId}/refund`, { method: 'POST', body: payload, context, idempotencyKey }));
  },
};

const catalog = {
  async resolvePrice(itemId, { tenantId, at, context }) {
    if (env.integration.mode === 'mock') return { itemId, price: null, mock: true };
    const query = new URLSearchParams();
    if (tenantId) query.set('tenantId', tenantId);
    if (at) query.set('at', new Date(at).toISOString());
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(await fetchJson(env.integration.catalogUrl, `/api/price-tables/resolve/${itemId}${suffix}`, { context }));
  },
};

const agend = {
  async getReservation(id, { context }) {
    if (env.integration.mode === 'mock') return { id, status: 'CONFIRMED', mock: true };
    return unwrap(await fetchJson(env.integration.agendUrl, `/api/appointments/${id}`, { context }));
  },
};

const billing = {
  async createOverage({ payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { id: `billing-${mockId()}`, status: 'PENDING', mock: true };
    return unwrap(await fetchJson(env.integration.billingUrl, process.env.BILLING_USAGE_PATH || '/api/internal/usage-sales', { method: 'POST', body: payload, context, idempotencyKey }));
  },
};

const pay = {
  async resolveEstablishment({ context }) {
    if (env.integration.mode === 'mock') return { id: 'mock-establishment' };
    const result = unwrap(await fetchJson(env.integration.payUrl, '/api/establishments', { method: 'GET', context }));
    const establishments = Array.isArray(result) ? result : result?.data || [];
    const establishment = establishments[0];
    if (!establishment?.id) throw new Error('Nenhum estabelecimento Paytime configurado para o tenant');
    return establishment;
  },

  async collectOverage({ payload, context, idempotencyKey }) {
    if (env.integration.mode === 'mock') return { id: `pay-${mockId()}`, status: 'AUTHORIZED', mock: true };
    const establishmentId = payload.establishmentId || context?.establishmentId || (await this.resolveEstablishment({ context })).id;
    const referenceId = payload.referenceId || idempotencyKey || `equipment:pay:${payload.sourceId}`;
    const checkoutPayload = {
      title: payload.title || payload.description || 'Excedente de locação',
      amount: payload.amount ?? Number((Number(payload.amountCents || 0) / 100).toFixed(2)),
      reference_id: referenceId,
    };
    return unwrap(await fetchJson(env.integration.payUrl, process.env.PAY_OVERAGE_PATH || `/api/establishments/${establishmentId}/checkout`, { method: 'POST', body: checkoutPayload, context, idempotencyKey: referenceId }));
  },
};

module.exports = { entitlements, catalog, agend, billing, pay };
