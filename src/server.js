const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');
const { logger } = require('./middlewares/operational');

const server = http.createServer(app);
let closing = false;

const shutdown = async (signal) => {
  if (closing) return;
  closing = true;
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => { logger.error({ err: error }, 'uncaught exception'); process.exit(1); });
process.on('unhandledRejection', (error) => { logger.error({ err: error }, 'unhandled rejection'); process.exit(1); });

server.listen(env.port, () => logger.info({ port: env.port }, 'operaon equipment listening'));
