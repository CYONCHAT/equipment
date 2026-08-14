'use strict';

const crypto = require('crypto');

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const buildIntegrationContext = (context = {}, { sourceSystem = 'equipment', eventId, idempotencyKey } = {}) => {
  const requestId = firstDefined(context.requestId, crypto.randomUUID());
  const correlationId = firstDefined(context.correlationId, requestId);
  const resolvedEventId = firstDefined(eventId, idempotencyKey, requestId);

  return {
    ...context,
    requestId,
    correlationId,
    sourceSystem,
    eventId: resolvedEventId,
    idempotencyKey: idempotencyKey || null,
  };
};

const eventEnvelope = ({ eventType, payload, context, idempotencyKey, occurredAt = new Date() }) => ({
  eventId: firstDefined(context?.eventId, idempotencyKey, crypto.randomUUID()),
  eventType,
  sourceSystem: context?.sourceSystem || 'equipment',
  tenantId: context?.tenantId || payload?.tenantId || null,
  organizationId: context?.organizationId || payload?.organizationId || null,
  correlationId: context?.correlationId || context?.requestId || null,
  occurredAt: new Date(occurredAt).toISOString(),
  payload,
});

module.exports = { buildIntegrationContext, eventEnvelope };

