const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class RentalSession extends Model {}
RentalSession.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: true },
  contractId: { type: DataTypes.UUID, allowNull: false },
  reservationId: { type: DataTypes.UUID, allowNull: true },
  assetId: { type: DataTypes.UUID, allowNull: false },
  entitlementId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('CHECKED_OUT', 'COMPLETED', 'COMPLETED_WITH_DEBT', 'CANCELLED', 'INCIDENT'), allowNull: false, defaultValue: 'CHECKED_OUT' },
  pickupCheckInAt: { type: DataTypes.DATE, allowNull: false },
  returnCheckOutAt: { type: DataTypes.DATE, allowNull: true },
  pickupOperatorId: { type: DataTypes.UUID, allowNull: true },
  returnOperatorId: { type: DataTypes.UUID, allowNull: true },
  pickupCollectionPointId: { type: DataTypes.STRING(120), allowNull: true },
  returnCollectionPointId: { type: DataTypes.STRING(120), allowNull: true },
  usedMinutes: { type: DataTypes.INTEGER, allowNull: true },
  includedMinutesUsed: { type: DataTypes.INTEGER, allowNull: true },
  overageMinutes: { type: DataTypes.INTEGER, allowNull: true },
  overageAmountCents: { type: DataTypes.INTEGER, allowNull: true },
  entitlementMovementId: { type: DataTypes.UUID, allowNull: true },
  billingItemId: { type: DataTypes.STRING(160), allowNull: true },
  payTransactionId: { type: DataTypes.STRING(160), allowNull: true },
  incidentCode: { type: DataTypes.STRING(100), allowNull: true },
  idempotencyKey: { type: DataTypes.STRING(220), allowNull: false },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { sequelize, modelName: 'RentalSession', tableName: 'rental_sessions', underscored: true });

module.exports = RentalSession;
