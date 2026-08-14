const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const { sequelize } = require('./models');
const { authenticate } = require('./middlewares/auth');
const { requestContext, authRateLimiter, errorHandler } = require('./middlewares/operational');
const equipmentRoutes = require('./routes/equipmentRoutes');

const { communicationContext } = require('./middlewares/communicationContext');

const app = express();
app.use(communicationContext);
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxyHops);
app.use(requestContext);
app.use(helmet());
app.use(cors({ origin: env.cors.origin, credentials: env.cors.origin !== '*' }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ success: true, service: env.serviceName, status: 'ok', timestamp: new Date().toISOString() }));
app.get('/ready', async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ success: true, service: env.serviceName, status: 'ready', database: 'ok' });
  } catch (error) {
    return res.status(503).json({ success: false, service: env.serviceName, status: 'not_ready', database: 'unavailable' });
  }
});

app.use('/api/equipment', authRateLimiter, authenticate, equipmentRoutes);
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada', requestId: req.requestId } }));
app.use(errorHandler);

module.exports = app;
