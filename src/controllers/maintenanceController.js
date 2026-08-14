const { maintenanceCreateSchema, maintenanceCompleteSchema, uuid } = require('../validators');
const { tenantFrom } = require('../services/domainUtils');
const service = require('../services/maintenanceService');
const { ValidationError } = require('../utils/errors');

const parse = (schema, value) => { const result = schema.safeParse(value); if (!result.success) throw new ValidationError('Dados de entrada inválidos', 'VALIDATION_ERROR', result.error.flatten()); return result.data; };
const tenant = (req, value = {}) => tenantFrom(req.context, { tenantId: value.tenantId || req.query.tenantId });
const bodyTenant = (req) => tenantFrom(req.context, req.body);

const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createOrder(parse(maintenanceCreateSchema, req.body), req.context) }); } catch (error) { return next(error); } };
const list = async (req, res, next) => { try { const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 100); const offset = Math.max(Number(req.query.offset || 0), 0); return res.json({ success: true, data: await service.listOrders({ tenantId: tenant(req), assetId: req.query.assetId, status: req.query.status, limit, offset }) }); } catch (error) { return next(error); } };
const start = async (req, res, next) => { try { const payload = parse(maintenanceCompleteSchema, req.body); return res.json({ success: true, data: await service.startOrder(uuid.parse(req.params.id), { ...payload, tenantId: bodyTenant(req) }, req.context) }); } catch (error) { return next(error); } };
const complete = async (req, res, next) => { try { const payload = parse(maintenanceCompleteSchema, req.body); return res.json({ success: true, data: await service.completeOrder(uuid.parse(req.params.id), { ...payload, tenantId: bodyTenant(req) }, req.context) }); } catch (error) { return next(error); } };
const cancel = async (req, res, next) => { try { return res.json({ success: true, data: await service.cancelOrder(uuid.parse(req.params.id), { tenantId: bodyTenant(req) }, req.context) }); } catch (error) { return next(error); } };

module.exports = { create, list, start, complete, cancel };
