require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || 'SenhaForte2026',
  database: process.env.DB_NAME || 'operaon_equipment',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.TEST_DB_NAME || 'operaon_equipment_test' },
  production: { ...base, logging: false },
};
