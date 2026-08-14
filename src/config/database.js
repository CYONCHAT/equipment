const { Sequelize } = require('sequelize');
const env = require('./env');

const databaseUrl = process.env.DATABASE_URL || null;
const sequelize = new Sequelize(databaseUrl || env.db.name, databaseUrl ? undefined : env.db.user, databaseUrl ? undefined : env.db.password, {
  host: databaseUrl ? undefined : env.db.host,
  port: databaseUrl ? undefined : env.db.port,
  dialect: 'postgres',
  logging: env.db.logging ? console.log : false,
  dialectOptions: env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
    idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
  },
  define: { underscored: true, freezeTableName: true, timestamps: true },
});

module.exports = sequelize;
