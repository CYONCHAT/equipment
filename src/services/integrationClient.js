const env = require('../config/env');
const { AppError } = require('../utils/errors');

const serviceKey = env.integration.serviceKey;

const headersFor = (context = {}, idempotencyKey) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Service-Key': serviceKey,
  };
  if (context.authorization) headers.Authorization = context.authorization;
  if (context.tenantId) headers['X-Tenant-Id'] = context.tenantId;
  if (context.organizationId) headers['X-Organization-Id'] = context.organizationId;
  if (context.requestId) headers['X-Request-Id'] = context.requestId;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return headers;
};

const fetchJson = async (baseUrl, path, { method = 'GET', body, context, idempotencyKey } = {}) => {
  if (env.integration.mode === 'mock') return { success: true, data: { mock: true } };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.integration.requestTimeoutMs);
  try {
    const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}${path}`, {
      method,
      headers: headersFor(context, idempotencyKey),
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
