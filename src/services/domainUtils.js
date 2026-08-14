const { ValidationError, AuthorizationError } = require('../utils/errors');

const tenantFrom = (context, payload) => {
  const tenantId = context?.tenantId || payload?.tenantId || null;
  if (!tenantId) throw new ValidationError('tenantId é obrigatório no contexto ou no payload', 'TENANT_REQUIRED');
  if (context?.tenantId && payload?.tenantId && context.tenantId !== payload.tenantId) {
    throw new AuthorizationError('O tenant do payload não corresponde ao contexto', 'TENANT_CONTEXT_MISMATCH');
  }
  return tenantId;
};

const idempotencyFrom = (req, fallback) => req.get('Idempotency-Key') || fallback;

const serialize = (value) => (value && typeof value.toJSON === 'function' ? value.toJSON() : value);

const minutesBetween = (start, end) => Math.max(0, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 60000));
const roundUp = (value, unit) => (value <= 0 ? 0 : Math.ceil(value / unit) * unit);

module.exports = { tenantFrom, idempotencyFrom, serialize, minutesBetween, roundUp };
