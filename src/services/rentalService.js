const crypto = require('crypto');
const { Op } = require('sequelize');
const env = require('../config/env');
const { sequelize, EquipmentAsset, RentalContract, EquipmentReservation, RentalSession, RentalUsageRecord, EquipmentInspection } = require('../models');
const { entitlements, agend, billing, pay } = require('./integrationServices');
const { findByQr, assertAvailable } = require('./assetService');
const { tenantFrom, serialize, minutesBetween, roundUp } = require('./domainUtils');
const { eventEnvelope } = require('../utils/integrationContext');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/errors');

const getContract = async (id, tenantId) => {
  const contract = await RentalContract.findOne({ where: { id, tenantId } });
  if (!contract) throw new NotFoundError('Contrato de locação não encontrado', 'RENTAL_CONTRACT_NOT_FOUND');
  return contract;
};
const getSession = async (id, tenantId) => {
  const session = await RentalSession.findOne({ where: { id, tenantId } });
  if (!session) throw new NotFoundError('Sessão de locação não encontrada', 'RENTAL_SESSION_NOT_FOUND');
  return session;
};
const serializeResult = (data, extra = {}) => ({ ...extra, data: serialize(data) });

const createContract = async (payload, context) => {
  const tenantId = tenantFrom(context, payload);
  const validFrom = payload.validFrom || new Date();
  if (payload.validUntil && payload.validUntil <= validFrom) throw new ValidationError('validUntil deve ser posterior a validFrom');
  try {
    const [contract, created] = await RentalContract.findOrCreate({
      where: { tenantId, sourceSystem: payload.sourceSystem, sourceId: payload.sourceId },
      defaults: {
        tenantId, organizationId: payload.organizationId || context.organizationId || null, entitlementId: payload.entitlementId,
        patientId: payload.patientId || null, catalogItemId: payload.catalogItemId || null, catalogPriceId: payload.catalogPriceId || null,
        sourceSystem: payload.sourceSystem, sourceId: payload.sourceId, mode: payload.mode, status: payload.status,
        includedMinutes: payload.includedMinutes, maxSessions: payload.maxSessions, overtimeRateCents: payload.overtimeRateCents,
        currency: payload.currency, validFrom, validUntil: payload.validUntil || null, metadata: payload.metadata || {}, createdBy: context.userId,
      },
    });
    if (!created) return serializeResult(contract, { idempotent: true });
    return serializeResult(contract, { idempotent: false });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw new ConflictError('Contrato já existe para esta referência', 'RENTAL_CONTRACT_DUPLICATE');
    throw error;
  }
};

const createReservation = async (payload, context, idempotencyKey) => {
  const tenantId = tenantFrom(context, payload);
  const idempotentExisting = await EquipmentReservation.findOne({ where: { tenantId, idempotencyKey } });
  if (idempotentExisting) return serializeResult(idempotentExisting, { idempotent: true });
  await getContract(payload.contractId, tenantId);
  const asset = await EquipmentAsset.findOne({ where: { id: payload.assetId, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento não encontrado', 'ASSET_NOT_FOUND');
  if (env.integration.mode !== 'mock' && !payload.agendReservationId) {
    throw new ValidationError('A reserva oficial do Agend é obrigatória para reservar o equipamento.', 'AGEND_RESERVATION_REQUIRED');
  }
  let scheduledStart = payload.scheduledStart;
  let scheduledEnd = payload.scheduledEnd;
  if (payload.agendReservationId) {
    const appointment = await agend.getReservation(payload.agendReservationId, { ...context });
    if (['CANCELLED', 'COMPLETED', 'EXPIRED'].includes(String(appointment.status || '').toUpperCase())) throw new ConflictError('Reserva do Agend não está disponível', 'AGEND_RESERVATION_UNAVAILABLE');
    const officialStart = new Date(appointment.appointmentDate);
    const officialDuration = Number(appointment.duration);
    if (env.integration.mode !== 'mock' && (!appointment.appointmentDate || Number.isNaN(officialStart.getTime()) || !Number.isFinite(officialDuration) || officialDuration <= 0)) {
      throw new ValidationError('A reserva do Agend não possui janela temporal válida.', 'AGEND_RESERVATION_TIME_INVALID');
    }
    if (!Number.isNaN(officialStart.getTime()) && Number.isFinite(officialDuration) && officialDuration > 0) {
      scheduledStart = officialStart;
      scheduledEnd = new Date(officialStart.getTime() + officialDuration * 60000);
    }
  }
  if (!(scheduledStart instanceof Date) || Number.isNaN(scheduledStart.getTime()) || !(scheduledEnd instanceof Date) || Number.isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
    throw new ValidationError('A janela temporal da reserva é inválida.', 'RESERVATION_TIME_INVALID');
  }
  const overlap = await EquipmentReservation.findOne({ where: { tenantId, assetId: payload.assetId, status: { [Op.in]: ['PENDING', 'CONFIRMED'] }, scheduledStart: { [Op.lt]: scheduledEnd }, scheduledEnd: { [Op.gt]: scheduledStart } } });
  if (overlap) throw new ConflictError('Equipamento já reservado no intervalo informado', 'ASSET_RESERVATION_CONFLICT');
  const [existing, created] = await EquipmentReservation.findOrCreate({
    where: { tenantId, idempotencyKey },
    defaults: {
      tenantId, organizationId: payload.organizationId || context.organizationId || null, contractId: payload.contractId, assetId: payload.assetId,
      agendReservationId: payload.agendReservationId || null, userId: payload.userId || context.userId || null, collectionPointId: payload.collectionPointId || null,
      scheduledStart, scheduledEnd, status: payload.status, idempotencyKey, metadata: payload.metadata || {}, createdBy: context.userId,
    },
  });
  if (!created) return serializeResult(existing, { idempotent: true });
  if (!existing.contractId) throw new ConflictError('Reserva idempotente inválida', 'RESERVATION_INVALID');
  return serializeResult(existing, { idempotent: false });
};

const checkIn = async (payload, context, idempotencyKey) => {
  const tenantId = tenantFrom(context, payload);
  const existing = await RentalSession.findOne({ where: { tenantId, idempotencyKey } });
  if (existing) return serializeResult(existing, { idempotent: true });
  const contract = await getContract(payload.contractId, tenantId);
  const now = payload.pickupAt || new Date();
  if (contract.status !== 'ACTIVE') throw new ConflictError('Contrato não está ativo', 'RENTAL_CONTRACT_INACTIVE');
  if (contract.validUntil && new Date(contract.validUntil) < now) throw new ConflictError('Contrato expirado', 'RENTAL_CONTRACT_EXPIRED');
  const asset = await findByQr(tenantId, payload.serialNumber, payload.qrPublicToken);
  await assertAvailable(asset, tenantId);
  let reservation = null;
  if (payload.reservationId) {
    reservation = await EquipmentReservation.findOne({ where: { id: payload.reservationId, tenantId } });
    if (!reservation) throw new NotFoundError('Reserva de equipamento não encontrada', 'RESERVATION_NOT_FOUND');
    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) throw new ConflictError('Reserva não pode iniciar uma sessão', 'RESERVATION_NOT_AVAILABLE');
    if (reservation.assetId !== asset.id || reservation.contractId !== contract.id) throw new ConflictError('Reserva não corresponde ao equipamento ou contrato', 'RESERVATION_CONTEXT_MISMATCH');
  }
  const appointmentId = reservation?.agendReservationId || null;
  if (env.integration.mode !== 'mock' && !appointmentId) {
    throw new ValidationError('A reserva oficial do Agend é obrigatória para iniciar a locação.', 'AGEND_RESERVATION_REQUIRED');
  }

  const reserveIdempotencyKey = `equipment:reserve:${idempotencyKey}`;
  const reservePayload = { tenantId, organizationId: contract.organizationId, appointmentId, reason: `equipment rental check-in ${idempotencyKey}` };
  const reserveResult = await entitlements.reserve({
    entitlementId: contract.entitlementId,
    payload: { ...reservePayload, event: eventEnvelope({ eventType: 'equipment.rental.credit.reserve', payload: reservePayload, context, idempotencyKey: reserveIdempotencyKey }) },
    context, idempotencyKey: reserveIdempotencyKey,
  });
  const sessionId = crypto.randomUUID();
  try {
    const session = await sequelize.transaction(async (transaction) => {
      const created = await RentalSession.create({
        id: sessionId, tenantId, organizationId: contract.organizationId, contractId: contract.id, reservationId: reservation?.id || null,
        assetId: asset.id, entitlementId: contract.entitlementId, status: 'CHECKED_OUT', pickupCheckInAt: now,
        pickupOperatorId: context.userId, pickupCollectionPointId: payload.collectionPointId || asset.collectionPointId || null,
        idempotencyKey, metadata: { ...(payload.metadata || {}), entitlementReserveMovementId: reserveResult.movement?.id || null },
      }, { transaction });
      await RentalUsageRecord.create({ tenantId, sessionId: created.id, eventType: 'CHECK_IN', occurredAt: now, idempotencyKey: `${idempotencyKey}:check-in`, actorId: context.userId, payload: { serialNumber: asset.serialNumber, qrVersion: asset.qrVersion } }, { transaction });
      await asset.update({ status: 'IN_USE', updatedBy: context.userId }, { transaction });
      if (reservation) await reservation.update({ status: 'CONFIRMED', updatedBy: context.userId }, { transaction });
      return created;
    });
    return serializeResult(session, { idempotent: false, entitlementMovementId: reserveResult.movement?.id || null });
  } catch (error) {
    const releaseIdempotencyKey = `equipment:release:${sessionId}`;
    const releasePayload = { tenantId, organizationId: contract.organizationId, appointmentId: reservation?.agendReservationId || null, reason: `equipment check-in rollback ${sessionId}` };
    await entitlements.release({ entitlementId: contract.entitlementId, payload: { ...releasePayload, event: eventEnvelope({ eventType: 'equipment.rental.credit.release', payload: releasePayload, context, idempotencyKey: releaseIdempotencyKey }) }, context, idempotencyKey: releaseIdempotencyKey }).catch(() => undefined);
    throw error;
  }
};

const checkOut = async (sessionId, payload, context, idempotencyKey) => {
  const tenantId = tenantFrom(context, payload);
  const session = await getSession(sessionId, tenantId);
  if (session.status !== 'CHECKED_OUT') return serializeResult(session, { idempotent: true });
  const contract = await getContract(session.contractId, tenantId);
  const asset = await EquipmentAsset.findOne({ where: { id: session.assetId, tenantId } });
  if (!asset) throw new NotFoundError('Equipamento da sessão não encontrado', 'ASSET_NOT_FOUND');
  if (payload.qrPublicToken && payload.qrPublicToken !== asset.qrPublicToken) throw new ConflictError('QR Code não corresponde ao equipamento da sessão', 'QR_ASSET_MISMATCH');
  const returnAt = payload.returnAt || new Date();
  if (returnAt < new Date(session.pickupCheckInAt)) throw new ValidationError('returnAt não pode ser anterior ao check-in');
  const reservation = session.reservationId
    ? await EquipmentReservation.findOne({ where: { id: session.reservationId, tenantId } })
    : null;
  const appointmentId = reservation?.agendReservationId || null;
  if (env.integration.mode !== 'mock' && !appointmentId) {
    throw new ValidationError('A sessão não possui a referência oficial do Agend.', 'AGEND_RESERVATION_REQUIRED');
  }
  const usedMinutes = minutesBetween(session.pickupCheckInAt, returnAt);
  const availableIncluded = Math.max(contract.includedMinutes - contract.usedMinutes, 0);
  const includedMinutesUsed = Math.min(usedMinutes, availableIncluded);
  const overageMinutes = Math.max(usedMinutes - availableIncluded, 0);
  const billableOverageMinutes = roundUp(overageMinutes, env.rental.overtimeRoundingMinutes);
  const overageAmountCents = Math.ceil((billableOverageMinutes / 60) * contract.overtimeRateCents);
  const consumeIdempotencyKey = `equipment:consume:${session.id}`;
  const consumePayload = { tenantId, organizationId: session.organizationId, appointmentId, reason: `equipment rental check-out ${session.id}` };
  const consumeResult = await entitlements.consume({
    entitlementId: session.entitlementId,
    payload: { ...consumePayload, event: eventEnvelope({ eventType: 'equipment.rental.credit.consume', payload: consumePayload, context, idempotencyKey: consumeIdempotencyKey }) },
    context, idempotencyKey: consumeIdempotencyKey,
  });

  let billingResult = null;
  let payResult = null;
  if (overageAmountCents > 0) {
    const billingIdempotencyKey = `equipment:billing:${session.id}`;
    const billingPayload = { tenantId, organizationId: session.organizationId, patientId: contract.patientId, catalogItemId: contract.catalogItemId, sourceSystem: 'equipment', sourceId: session.id, contractId: contract.id, description: `Excedente de locação do equipamento ${asset.serialNumber}`, quantity: billableOverageMinutes, unit: 'MINUTE', amountCents: overageAmountCents, currency: contract.currency, mode: contract.mode };
    billingResult = await billing.createOverage({ payload: { ...billingPayload, event: eventEnvelope({ eventType: 'equipment.rental.overage.created', payload: billingPayload, context, idempotencyKey: billingIdempotencyKey }) }, context, idempotencyKey: billingIdempotencyKey });
    try {
      const payIdempotencyKey = `equipment:pay:${session.id}`;
      const payPayload = { tenantId, organizationId: session.organizationId, sourceSystem: 'equipment', sourceId: session.id, billingItemId: billingResult.id || billingResult.data?.id, title: `Excedente de locação do equipamento ${asset.serialNumber}`, amountCents: overageAmountCents, currency: contract.currency, mode: contract.mode, referenceId: payIdempotencyKey };
      payResult = await pay.collectOverage({ payload: { ...payPayload, event: eventEnvelope({ eventType: 'equipment.rental.overage.payment_requested', payload: payPayload, context, idempotencyKey: payIdempotencyKey }) }, context, idempotencyKey: payIdempotencyKey });
    } catch (error) {
      payResult = { status: 'PENDING', errorCode: error.code, errorMessage: error.message };
    }
  }
  const paymentStatus = String(payResult?.status || '').toUpperCase();
  const hasDebt = overageAmountCents > 0 && !['AUTHORIZED', 'CAPTURED', 'SUCCEEDED', 'PAID', 'CONFIRMED'].includes(paymentStatus);
  const finalStatus = hasDebt ? 'COMPLETED_WITH_DEBT' : 'COMPLETED';

  const result = await sequelize.transaction(async (transaction) => {
    const locked = await RentalSession.findOne({ where: { id: session.id, tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (locked.status !== 'CHECKED_OUT') return locked;
    await locked.update({
      status: finalStatus, returnCheckOutAt: returnAt, returnOperatorId: context.userId, returnCollectionPointId: payload.returnCollectionPointId || null,
      usedMinutes, includedMinutesUsed, overageMinutes: billableOverageMinutes, overageAmountCents, entitlementMovementId: consumeResult.movement?.id || null,
      billingItemId: billingResult?.id || billingResult?.data?.id || null, payTransactionId: payResult?.id || payResult?.data?.id || null,
      metadata: { ...(locked.metadata || {}), ...(payload.metadata || {}), paymentStatus: payResult?.status || null },
    }, { transaction });
    await RentalUsageRecord.create({ tenantId, sessionId: locked.id, eventType: 'CHECK_OUT', occurredAt: returnAt, usedMinutes, idempotencyKey: `${idempotencyKey}:check-out`, actorId: context.userId, payload: { overageMinutes: billableOverageMinutes, overageAmountCents, finalStatus } }, { transaction });
    const condition = payload.inspection?.condition || 'OK';
    await EquipmentInspection.create({ tenantId, assetId: asset.id, sessionId: locked.id, phase: 'RETURN', condition, meterMinutes: payload.meterMinutes ?? null, notes: payload.inspection?.notes || null, mediaObjectIds: payload.inspection?.mediaObjectIds || [], additionalChargeCents: payload.inspection?.additionalChargeCents || 0, createdBy: context.userId }, { transaction });
    await asset.update({ status: condition === 'OK' ? 'OPERATIONAL' : 'QUARANTINED', meterMinutes: payload.meterMinutes ?? asset.meterMinutes, updatedBy: context.userId }, { transaction });
    await contract.update({ usedMinutes: contract.usedMinutes + usedMinutes, usedSessions: contract.usedSessions + 1, status: (contract.usedSessions + 1 >= contract.maxSessions || contract.usedMinutes + usedMinutes >= contract.includedMinutes) ? 'EXHAUSTED' : contract.status, updatedBy: context.userId }, { transaction });
    if (session.reservationId) await EquipmentReservation.update({ status: 'COMPLETED', updatedBy: context.userId }, { where: { id: session.reservationId, tenantId }, transaction });
    return locked;
  });
  return serializeResult(result, { idempotent: false, entitlementMovementId: consumeResult.movement?.id || null, billing: billingResult, payment: payResult, hasDebt });
};

const listContracts = async ({ tenantId, status, limit = 100, offset = 0 }) => {
  const where = { tenantId }; if (status) where.status = status;
  const result = await RentalContract.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });
  return { rows: result.rows.map(serialize), count: result.count, limit, offset };
};
const listReservations = async ({ tenantId, status, limit = 100, offset = 0 }) => {
  const where = { tenantId }; if (status) where.status = status;
  const result = await EquipmentReservation.findAndCountAll({ where, order: [['scheduledStart', 'ASC']], limit, offset });
  return { rows: result.rows.map(serialize), count: result.count, limit, offset };
};
const listSessions = async ({ tenantId, status, limit = 100, offset = 0 }) => {
  const where = { tenantId }; if (status) where.status = status;
  const result = await RentalSession.findAndCountAll({ where, order: [['pickupCheckInAt', 'DESC']], limit, offset });
  return { rows: result.rows.map(serialize), count: result.count, limit, offset };
};

module.exports = { createContract, createReservation, checkIn, checkOut, getContract, getSession, listContracts, listReservations, listSessions };
