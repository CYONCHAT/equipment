const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class RentalContract extends Model {}
RentalContract.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: true },
  entitlementId: { type: DataTypes.UUID, allowNull: false },
  patientId: { type: DataTypes.UUID, allowNull: true },
  catalogItemId: { type: DataTypes.UUID, allowNull: true },
  catalogPriceId: { type: DataTypes.UUID, allowNull: true },
  sourceSystem: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'equipment' },
  sourceId: { type: DataTypes.STRING(160), allowNull: false },
  mode: { type: DataTypes.ENUM('PREPAID', 'POSTPAID'), allowNull: false },
  status: { type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'EXHAUSTED', 'CANCELLED', 'EXPIRED'), allowNull: false, defaultValue: 'DRAFT' },
  includedMinutes: { type: DataTypes.INTEGER, allowNull: false },
  maxSessions: { type: DataTypes.INTEGER, allowNull: false },
  overtimeRateCents: { type: DataTypes.INTEGER, allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
  validFrom: { type: DataTypes.DATE, allowNull: false },
  validUntil: { type: DataTypes.DATE, allowNull: true },
  usedMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  usedSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'RentalContract', tableName: 'rental_contracts', underscored: true });

module.exports = RentalContract;
