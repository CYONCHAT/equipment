const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class RentalUsageRecord extends Model {}
RentalUsageRecord.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  eventType: { type: DataTypes.ENUM('CHECK_IN', 'CHECK_OUT', 'EXTENSION', 'INCIDENT', 'ADJUSTMENT'), allowNull: false },
  occurredAt: { type: DataTypes.DATE, allowNull: false },
  usedMinutes: { type: DataTypes.INTEGER, allowNull: true },
  idempotencyKey: { type: DataTypes.STRING(220), allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: true },
  payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { sequelize, modelName: 'RentalUsageRecord', tableName: 'rental_usage_records', underscored: true });

module.exports = RentalUsageRecord;
