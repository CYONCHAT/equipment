const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class EquipmentInspection extends Model {}
EquipmentInspection.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  assetId: { type: DataTypes.UUID, allowNull: false },
  sessionId: { type: DataTypes.UUID, allowNull: true },
  phase: { type: DataTypes.ENUM('PICKUP', 'RETURN'), allowNull: false },
  condition: { type: DataTypes.ENUM('OK', 'DAMAGE', 'MISSING_PART', 'DIRTY', 'FAILED'), allowNull: false },
  meterMinutes: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  mediaObjectIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  additionalChargeCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  createdBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'EquipmentInspection', tableName: 'equipment_inspections', underscored: true });

module.exports = EquipmentInspection;
