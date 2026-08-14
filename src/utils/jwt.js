const jwt = require('jsonwebtoken');
const env = require('../config/env');

const verifyAccessToken = (token) => {
  const key = env.jwt.publicKey || env.jwt.secret;
  const claims = jwt.verify(token, key, {
    algorithms: [env.jwt.algorithm],
    issuer: env.jwt.issuer,
    audience: env.jwt.audiences,
  });
  if (claims.tokenType && claims.tokenType !== 'access' && claims.tokenType !== 'service') return null;
  return claims;
};

module.exports = { verifyAccessToken };
