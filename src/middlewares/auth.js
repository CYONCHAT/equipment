const crypto = require('crypto');
const env = require('../config/env');
const { verifyAccessToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const sameSecret = (provided, expected) => {
  const left = Buffer.from(String(provided || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const getBearerToken = (header) => {
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

const authenticate = (req, _res, next) => {
  try {
    if (!sameSecret(req.get('X-Service-Key'), env.serviceApiKey)) {
      throw new AuthenticationError('Credencial de serviço inválida', 'SERVICE_AUTH_INVALID');
    }
    const token = getBearerToken(req.get('Authorization'));
    if (!token) throw new AuthenticationError('Token de acesso ausente', 'ACCESS_TOKEN_MISSING');
    const claims = verifyAccessToken(token);
    if (!claims) throw new AuthenticationError('Token de acesso inválido', 'ACCESS_TOKEN_INVALID');

    const headerTenantId = req.get('X-Tenant-Id') || null;
    if (headerTenantId && claims.tenantId && headerTenantId !== claims.tenantId) {
      throw new AuthorizationError('Contexto de tenant inconsistente', 'TENANT_CONTEXT_MISMATCH');
    }
    const headerOrganizationId = req.get('X-Organization-Id') || null;
    if (headerOrganizationId && Array.isArray(claims.organizationIds) && claims.organizationIds.length && !claims.organizationIds.includes(headerOrganizationId)) {
      throw new AuthorizationError('Contexto de organização inconsistente', 'ORGANIZATION_CONTEXT_MISMATCH');
    }

    req.auth = claims;
    req.context = {
      userId: claims.sub || claims.id || null,
      tenantId: claims.tenantId || headerTenantId || null,
      organizationId: claims.organizationId || headerOrganizationId || null,
      roles: Array.isArray(claims.roles) ? claims.roles : [],
      permissions: Array.isArray(claims.permissions) ? claims.permissions : [],
      organizationIds: Array.isArray(claims.organizationIds) ? claims.organizationIds : [],
      isService: Boolean(claims.service || claims.tokenType === 'service'),
      requestId: req.requestId || req.get('X-Request-Id') || null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const hasPermission = (req, resource, action) => {
  const permissions = req.context?.permissions || [];
  return permissions.includes('*:*') || permissions.includes(`${resource}:${action}`) || permissions.includes(`${action}:${resource}`);
};

const requirePermission = (resource, action) => (req, _res, next) => {
  if (hasPermission(req, resource, action)) return next();
  return next(new AuthorizationError(`Permissão necessária: ${resource}:${action}`, 'PERMISSION_DENIED'));
};

module.exports = { authenticate, requirePermission, hasPermission, getBearerToken };
