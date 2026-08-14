const env = require('../config/env');
const { AppError } = require('../utils/errors');
const { buildIntegrationContext } = require('../utils/integrationContext');
const { buildInternalHeaders } = require('../middlewares/communicationContext');

const serviceKey = env.integration.serviceKey;

const headersFor = (context = {}, idempotencyKey) => {
  return buildInternalHeaders({
    context,
    serviceId: process.env.SERVICE_NAME || 'operaon-equipment',
    serviceKey,
    accessToken: context.authorization,
    idempotencyKey,
    tenantId: context.tenantId,
    organizationId: context.organizationId,
  });
};

const fetchJson = async (baseUrl, path, { method = 'GET', body, context, idempotencyKey } = {}) => {
  if (env.integration.mode === 'mock') return { success: true, data: { mock: true } };
  const integrationContext = buildIntegrationContext(context, { sourceSystem: context?.sourceSystem || 'equipment', idempotencyKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.integration.requestTimeoutMs);
  try {
    const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}${path}`, {
      method,
      headers: headersFor(integrationContext, idempotencyKey),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch (_error) { payload = { raw: text }; }
    if (!response.ok) {
      throw new AppError(payload?.error?.message || payload?.message || `Serviço remoto respondeu ${response.status}`, 'REMOTE_SERVICE_ERROR', response.status >= 500 ? 502 : response.status, { upstreamStatus: response.status, upstream: payload });
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new AppError('Tempo limite de integração excedido', 'REMOTE_SERVICE_TIMEOUT', 504);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { fetchJson, headersFor };
