const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const env = require('../config/env');

const logger = pino({ name: env.serviceName, level: process.env.LOG_LEVEL || 'info' });

const requestContext = (req, res, next) => {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  const startedAt = Date.now();
  res.on('finish', () => logger.info({ requestId, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - startedAt }, 'request completed'));
  next();
};

const authRateLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: (req) => req.path === '/health' || req.path === '/ready' });

const errorHandler = (error, req, res, _next) => {
  const status = Number(error.status) || 500;
  const body = { success: false, error: { code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Erro interno do serviço' : error.message, requestId: req.requestId } };
  if (error.details !== undefined) body.error.details = error.details;
  if (status >= 500) logger.error({ err: error, requestId: req.requestId }, 'request failed');
  return res.status(status).json(body);
};

module.exports = { logger, requestContext, authRateLimiter, errorHandler };
