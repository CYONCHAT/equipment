const { z } = require('zod');

const uuid = z.string().uuid();
const date = z.coerce.date();
const idempotencyKey = z.string().trim().min(1).max(220);
const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().nonnegative();
const nullableUuid = uuid.nullable().optional();

const assetCreateSchema = z.object({
  tenantId: uuid.optional(), organizationId: nullableUuid, serialNumber: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160), manufacturer: z.string().trim().max(120).nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(), collectionPointId: z.string().trim().max(120).nullable().optional(),
  metadata: z.record(z.any()).optional(),
}).strict();

const assetUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(), manufacturer: z.string().trim().max(120).nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(), collectionPointId: z.string().trim().max(120).nullable().optional(),
  status: z.enum(['OPERATIONAL', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'QUARANTINED', 'RETIRED']).optional(),
  meterMinutes: nonNegativeInt.optional(), metadata: z.record(z.any()).optional(),
}).strict();

const contractCreateSchema = z.object({
  tenantId: uuid.optional(), organizationId: nullableUuid, entitlementId: uuid, patientId: nullableUuid,
  catalogItemId: nullableUuid, catalogPriceId: nullableUuid, sourceSystem: z.string().trim().min(1).max(80).default('equipment'),
  sourceId: z.string().trim().min(1).max(160), mode: z.enum(['PREPAID', 'POSTPAID']), status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
  includedMinutes: positiveInt, maxSessions: positiveInt, overtimeRateCents: nonNegativeInt, currency: z.string().trim().length(3).default('BRL'),
  validFrom: date.optional(), validUntil: date.nullable().optional(), metadata: z.record(z.any()).optional(),
}).strict();

const reservationCreateSchema = z.object({
  tenantId: uuid.optional(), organizationId: nullableUuid, contractId: uuid, assetId: uuid, agendReservationId: z.string().trim().min(1).max(160),
  userId: nullableUuid, collectionPointId: z.string().trim().max(120).nullable().optional(), scheduledStart: date, scheduledEnd: date,
  status: z.enum(['PENDING', 'CONFIRMED']).default('CONFIRMED'), metadata: z.record(z.any()).optional(),
}).strict().refine((value) => value.scheduledEnd > value.scheduledStart, { message: 'scheduledEnd deve ser posterior a scheduledStart', path: ['scheduledEnd'] });

const checkInSchema = z.object({
  tenantId: uuid.optional(), organizationId: nullableUuid, contractId: uuid, reservationId: nullableUuid, serialNumber: z.string().trim().min(1).max(120),
  qrPublicToken: z.string().trim().min(1).max(160).optional(), collectionPointId: z.string().trim().max(120).nullable().optional(),
  pickupAt: date.optional(), metadata: z.record(z.any()).optional(),
}).strict();

const checkOutSchema = z.object({
  tenantId: uuid.optional(), organizationId: nullableUuid, qrPublicToken: z.string().trim().max(160).nullable().optional(),
  returnAt: date.optional(), returnCollectionPointId: z.string().trim().max(120).nullable().optional(),
  meterMinutes: nonNegativeInt.nullable().optional(), inspection: z.object({
    condition: z.enum(['OK', 'DAMAGE', 'MISSING_PART', 'DIRTY', 'FAILED']), notes: z.string().max(5000).nullable().optional(),
    mediaObjectIds: z.array(uuid).optional(), additionalChargeCents: nonNegativeInt.optional(),
  }).optional(), metadata: z.record(z.any()).optional(),
}).strict();

const maintenanceCreateSchema = z.object({
  tenantId: uuid.optional(), assetId: uuid, type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'), description: z.string().trim().min(1).max(10000),
  scheduledAt: date.nullable().optional(), costCents: nonNegativeInt.default(0), metadata: z.record(z.any()).optional(),
}).strict();

const maintenanceCompleteSchema = z.object({
  tenantId: uuid.optional(), notes: z.string().max(5000).nullable().optional(), costCents: nonNegativeInt.optional(),
}).strict();

module.exports = { uuid, idempotencyKey, assetCreateSchema, assetUpdateSchema, contractCreateSchema, reservationCreateSchema, checkInSchema, checkOutSchema, maintenanceCreateSchema, maintenanceCompleteSchema };
