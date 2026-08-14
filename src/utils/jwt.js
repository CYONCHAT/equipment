const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AuthenticationError } = require('./errors');

const verifyAccessToken = (token) => {
  try {
    const key = env.jwt.publicKey || env.jwt.secret;
    const claims = jwt.verify(token, key, {
      algorithms: [env.jwt.algorithm],
      issuer: env.jwt.issuer,
      audience: env.jwt.audiences,
    });
    if (claims.tokenType && claims.tokenType !== 'access' && claims.tokenType !== 'service') return null;
    return claims;
  } catch (_error) {
    throw new AuthenticationError('Token de acesso inválido', 'ACCESS_TOKEN_INVALID');
  }
};

module.exports = { verifyAccessToken };
