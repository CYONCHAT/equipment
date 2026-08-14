const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class EquipmentAsset extends Model {}
EquipmentAsset.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: true },
  serialNumber: { type: DataTypes.STRING(120), allowNull: false },
  qrPublicToken: { type: DataTypes.STRING(160), allowNull: false },
  qrVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  name: { type: DataTypes.STRING(160), allowNull: false },
  manufacturer: { type: DataTypes.STRING(120), allowNull: true },
  model: { type: DataTypes.STRING(120), allowNull: true },
  status: { type: DataTypes.ENUM('OPERATIONAL', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'QUARANTINED', 'RETIRED'), allowNull: false, defaultValue: 'OPERATIONAL' },
  collectionPointId: { type: DataTypes.STRING(120), allowNull: true },
  meterMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'EquipmentAsset', tableName: 'equipment_assets', underscored: true });

module.exports = EquipmentAsset;
