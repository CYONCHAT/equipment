const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class EquipmentReservation extends Model {}
EquipmentReservation.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: true },
  contractId: { type: DataTypes.UUID, allowNull: false },
  assetId: { type: DataTypes.UUID, allowNull: false },
  agendReservationId: { type: DataTypes.STRING(160), allowNull: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  collectionPointId: { type: DataTypes.STRING(120), allowNull: true },
  scheduledStart: { type: DataTypes.DATE, allowNull: false },
  scheduledEnd: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'), allowNull: false, defaultValue: 'PENDING' },
  idempotencyKey: { type: DataTypes.STRING(220), allowNull: false },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'EquipmentReservation', tableName: 'equipment_reservations', underscored: true });

module.exports = EquipmentReservation;
