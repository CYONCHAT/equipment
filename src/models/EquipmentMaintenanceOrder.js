const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class EquipmentMaintenanceOrder extends Model {}
EquipmentMaintenanceOrder.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  assetId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('PREVENTIVE', 'CORRECTIVE', 'INSPECTION'), allowNull: false },
  status: { type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'OPEN' },
  priority: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), allowNull: false, defaultValue: 'MEDIUM' },
  description: { type: DataTypes.TEXT, allowNull: false },
  scheduledAt: { type: DataTypes.DATE, allowNull: true },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  costCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'EquipmentMaintenanceOrder', tableName: 'equipment_maintenance_orders', underscored: true });

module.exports = EquipmentMaintenanceOrder;
