const QRCode = require('qrcode');
const { assetCreateSchema, assetUpdateSchema, uuid } = require('../validators');
const { tenantFrom } = require('../services/domainUtils');
const service = require('../services/assetService');
const { ValidationError } = require('../utils/errors');

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError('Dados de entrada inválidos', 'VALIDATION_ERROR', result.error.flatten());
  return result.data;
};
const tenant = (req, value = {}) => tenantFrom(req.context, { tenantId: value.tenantId || req.query.tenantId });

const create = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createAsset(parse(assetCreateSchema, req.body), req.context) }); } catch (error) { return next(error); } };
const list = async (req, res, next) => { try { const tenantId = tenant(req); const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 100); const offset = Math.max(Number(req.query.offset || 0), 0); return res.json({ success: true, data: await service.listAssets({ tenantId, status: req.query.status, limit, offset }) }); } catch (error) { return next(error); } };
const get = async (req, res, next) => { try { const id = parse(uuid, req.params.id); return res.json({ success: true, data: await service.getAsset(id, tenant(req)) }); } catch (error) { return next(error); } };
const getByQr = async (req, res, next) => { try { return res.json({ success: true, data: await service.findByQr(tenant(req), req.params.serialNumber, req.query.qrPublicToken) }); } catch (error) { return next(error); } };
const qr = async (req, res, next) => { try { const id = parse(uuid, req.params.id); return res.json({ success: true, data: await service.qrPayload(id, tenant(req)) }); } catch (error) { return next(error); } };
const update = async (req, res, next) => { try { const payload = parse(assetUpdateSchema, req.body); return res.json({ success: true, data: await service.updateAsset(parse(uuid, req.params.id), payload, req.context) }); } catch (error) { return next(error); } };
const qrImage = async (req, res, next) => {
  try {
    const data = await service.qrPayload(uuid.parse(req.params.id), tenant(req));
    const buffer = await QRCode.toBuffer(JSON.stringify({ serialNumber: data.serialNumber, qrPublicToken: data.qrPublicToken, tenantId: data.tenantId }), { type: 'png', width: 600, margin: 2, errorCorrectionLevel: 'H' });
    res.type('png').set('Cache-Control', 'private, max-age=3600').send(buffer);
  } catch (error) { return next(error); }
};

module.exports = { create, list, get, getByQr, qr, qrImage, update };
