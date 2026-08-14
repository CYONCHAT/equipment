const { sequelize, EquipmentAsset, EquipmentMaintenanceOrder } = require('../models');
const { tenantFrom, serialize } = require('./domainUtils');
const { NotFoundError, ConflictError } = require('../utils/errors');

const getOrder = async (id, tenantId) => {
  const order = await EquipmentMaintenanceOrder.findOne({ where: { id, tenantId } });
  if (!order) throw new NotFoundError('Ordem de manutenção não encontrada', 'MAINTENANCE_ORDER_NOT_FOUND');
  return order;
};

const createOrder = async (payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const asset = await EquipmentAsset.findOne({ where: { id: payload.assetId, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento não encontrado', 'ASSET_NOT_FOUND');
  const order = await sequelize.transaction(async (transaction) => {
    const created = await EquipmentMaintenanceOrder.create({
      tenantId, assetId: asset.id, type: payload.type, priority: payload.priority, description: payload.description,
      scheduledAt: payload.scheduledAt || null, costCents: payload.costCents || 0, metadata: payload.metadata || {}, createdBy: context.userId,
    }, { transaction });
    if (asset.status !== 'IN_USE') await asset.update({ status: 'MAINTENANCE', updatedBy: context.userId }, { transaction });
    return created;
  });
  return serialize(order);
};

const listOrders = async ({ tenantId, assetId, status, limit = 100, offset = 0 }) => {
  const where = { tenantId }; if (assetId) where.assetId = assetId; if (status) where.status = status;
  const result = await EquipmentMaintenanceOrder.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });
  return { rows: result.rows.map(serialize), count: result.count, limit, offset };
};

const startOrder = async (id, payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const order = await getOrder(id, tenantId);
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') throw new ConflictError('Ordem de manutenção encerrada', 'MAINTENANCE_ORDER_CLOSED');
  await order.update({ status: 'IN_PROGRESS', startedAt: order.startedAt || new Date(), updatedBy: context.userId });
  return serialize(order);
};

const completeOrder = async (id, payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const order = await getOrder(id, tenantId);
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return serialize(order);
  const result = await sequelize.transaction(async (transaction) => {
    await order.update({ status: 'COMPLETED', completedAt: new Date(), costCents: payload.costCents ?? order.costCents, updatedBy: context.userId, metadata: { ...(order.metadata || {}), notes: payload.notes || null } }, { transaction });
    const open = await EquipmentMaintenanceOrder.count({ where: { assetId: order.assetId, tenantId, status: ['OPEN', 'IN_PROGRESS'] }, transaction });
    if (!open) await EquipmentAsset.update({ status: 'OPERATIONAL', updatedBy: context.userId }, { where: { id: order.assetId, tenantId }, transaction });
    return order;
  });
  return serialize(result);
};

const cancelOrder = async (id, payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const order = await getOrder(id, tenantId);
  if (['COMPLETED', 'CANCELLED'].includes(order.status)) return serialize(order);
  await order.update({ status: 'CANCELLED', updatedBy: context.userId });
  const open = await EquipmentMaintenanceOrder.count({ where: { assetId: order.assetId, tenantId, status: ['OPEN', 'IN_PROGRESS'] } });
  if (!open) await EquipmentAsset.update({ status: 'OPERATIONAL', updatedBy: context.userId });
  return serialize(order);
};

module.exports = { createOrder, listOrders, startOrder, completeOrder, cancelOrder, getOrder };
