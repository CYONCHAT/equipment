const crypto = require('crypto');
const { EquipmentAsset, RentalSession, EquipmentMaintenanceOrder } = require('../models');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { tenantFrom, serialize } = require('./domainUtils');

const qrTokenFor = (tenantId, serialNumber) => crypto.createHash('sha256').update(`${tenantId}:${serialNumber}`).digest('hex').slice(0, 48);

const createAsset = async (payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const serialNumber = payload.serialNumber.trim();
  const existing = await EquipmentAsset.findOne({ where: { tenantId, serialNumber } });
  if (existing) throw new ConflictError('Número de série já cadastrado para este tenant', 'ASSET_SERIAL_DUPLICATE');
  const asset = await EquipmentAsset.create({
    tenantId, organizationId: payload.organizationId || context.organizationId || null, serialNumber,
    qrPublicToken: qrTokenFor(tenantId, serialNumber), name: payload.name.trim(), manufacturer: payload.manufacturer || null,
    model: payload.model || null, collectionPointId: payload.collectionPointId || null, metadata: payload.metadata || {}, createdBy: context.userId,
  });
  return serialize(asset);
};

const listAssets = async ({ tenantId, status, limit = 100, offset = 0 }) => {
  const where = { tenantId };
  if (status) where.status = status;
  const result = await EquipmentAsset.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });
  return { rows: result.rows.map(serialize), count: result.count, limit, offset };
};

const getAsset = async (id, tenantId) => {
  const asset = await EquipmentAsset.findOne({ where: { id, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento não encontrado', 'ASSET_NOT_FOUND');
  return serialize(asset);
};

const findByQr = async (tenantId, serialNumber, qrPublicToken) => {
  const asset = await EquipmentAsset.findOne({ where: { tenantId, serialNumber, ...(qrPublicToken ? { qrPublicToken } : {}) } });
  if (!asset) throw new NotFoundError('QR Code ou número de série não corresponde a um equipamento', 'QR_ASSET_NOT_FOUND');
  return asset;
};

const updateAsset = async (id, payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const asset = await EquipmentAsset.findOne({ where: { id, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento não encontrado', 'ASSET_NOT_FOUND');
  if (payload.status && payload.status === 'OPERATIONAL') {
    const openMaintenance = await EquipmentMaintenanceOrder.count({ where: { tenantId, assetId: id, status: ['OPEN', 'IN_PROGRESS'] } });
    if (openMaintenance) throw new ConflictError('Equipamento possui manutenção aberta', 'ASSET_MAINTENANCE_OPEN');
  }
  await asset.update({ ...payload, updatedBy: context.userId });
  return serialize(asset);
};

const qrPayload = async (id, tenantId) => {
  const asset = await EquipmentAsset.findOne({ where: { id, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento não encontrado', 'ASSET_NOT_FOUND');
  return { equipmentId: asset.id, tenantId: asset.tenantId, serialNumber: asset.serialNumber, qrPublicToken: asset.qrPublicToken, qrVersion: asset.qrVersion, scanPath: `/api/equipment/assets/qr/${encodeURIComponent(asset.serialNumber)}` };
};

const assertAvailable = async (asset, tenantId) => {
  if (asset.status !== 'OPERATIONAL') throw new ConflictError(`Equipamento não está disponível: ${asset.status}`, 'ASSET_NOT_AVAILABLE');
  const activeSession = await RentalSession.findOne({ where: { assetId: asset.id, tenantId, status: 'CHECKED_OUT' } });
  if (activeSession) throw new ConflictError('Equipamento já possui uma sessão ativa', 'ASSET_SESSION_ACTIVE');
};

module.exports = { createAsset, listAssets, getAsset, findByQr, updateAsset, qrPayload, assertAvailable, qrTokenFor };
