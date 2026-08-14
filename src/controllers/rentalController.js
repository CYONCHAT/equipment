const { contractCreateSchema, reservationCreateSchema, checkInSchema, checkOutSchema, uuid } = require('../validators');
const { tenantFrom, idempotencyFrom } = require('../services/domainUtils');
const service = require('../services/rentalService');
const { ValidationError } = require('../utils/errors');

const parse = (schema, value) => { const result = schema.safeParse(value); if (!result.success) throw new ValidationError('Dados de entrada inválidos', 'VALIDATION_ERROR', result.error.flatten()); return result.data; };
const tenant = (req, value = {}) => tenantFrom(req.context, { tenantId: value.tenantId || req.query.tenantId });
const mutationKey = (req, fallback) => idempotencyFrom(req, fallback);

const createContract = async (req, res, next) => { try { return res.status(201).json({ success: true, ...(await service.createContract(parse(contractCreateSchema, req.body), req.context)) }); } catch (error) { return next(error); } };
const listContracts = async (req, res, next) => { try { const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 100); const offset = Math.max(Number(req.query.offset || 0), 0); return res.json({ success: true, data: await service.listContracts({ tenantId: tenant(req), status: req.query.status, limit, offset }) }); } catch (error) { return next(error); } };
const getContract = async (req, res, next) => { try { return res.json({ success: true, data: await service.getContract(uuid.parse(req.params.id), tenant(req)) }); } catch (error) { return next(error); } };
const createReservation = async (req, res, next) => { try { const payload = parse(reservationCreateSchema, req.body); const fallbackKey = `equipment:reservation:${payload.contractId}:${payload.assetId}:${payload.agendReservationId || payload.scheduledStart?.toISOString() || 'pending'}`; return res.status(201).json({ success: true, ...(await service.createReservation(payload, req.context, mutationKey(req, fallbackKey))) }); } catch (error) { return next(error); } };
const listReservations = async (req, res, next) => { try { const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 100); const offset = Math.max(Number(req.query.offset || 0), 0); return res.json({ success: true, data: await service.listReservations({ tenantId: tenant(req), status: req.query.status, limit, offset }) }); } catch (error) { return next(error); } };
const checkIn = async (req, res, next) => { try { const payload = parse(checkInSchema, req.body); return res.status(201).json({ success: true, ...(await service.checkIn(payload, req.context, mutationKey(req, `equipment:check-in:${payload.contractId}:${payload.serialNumber}:${payload.pickupAt?.toISOString() || 'now'}`))) }); } catch (error) { return next(error); } };
const checkOut = async (req, res, next) => { try { const payload = parse(checkOutSchema, req.body); const sessionId = uuid.parse(req.params.id); return res.json({ success: true, ...(await service.checkOut(sessionId, payload, req.context, mutationKey(req, `equipment:check-out:${sessionId}`))) }); } catch (error) { return next(error); } };
const listSessions = async (req, res, next) => { try { const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 100); const offset = Math.max(Number(req.query.offset || 0), 0); return res.json({ success: true, data: await service.listSessions({ tenantId: tenant(req), status: req.query.status, limit, offset }) }); } catch (error) { return next(error); } };
const getSession = async (req, res, next) => { try { return res.json({ success: true, data: await service.getSession(uuid.parse(req.params.id), tenant(req)) }); } catch (error) { return next(error); } };

module.exports = { createContract, listContracts, getContract, createReservation, listReservations, checkIn, checkOut, listSessions, getSession };
