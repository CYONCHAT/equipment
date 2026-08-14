const sequelize = require('../config/database');
const EquipmentAsset = require('./EquipmentAsset');
const RentalContract = require('./RentalContract');
const EquipmentReservation = require('./EquipmentReservation');
const RentalSession = require('./RentalSession');
const RentalUsageRecord = require('./RentalUsageRecord');
const EquipmentInspection = require('./EquipmentInspection');
const EquipmentMaintenanceOrder = require('./EquipmentMaintenanceOrder');

module.exports = {
  sequelize,
  EquipmentAsset,
  RentalContract,
  EquipmentReservation,
  RentalSession,
  RentalUsageRecord,
  EquipmentInspection,
  EquipmentMaintenanceOrder,
};
