const { Router } = require('express');
const { requirePermission } = require('../middlewares/auth');
const asset = require('../controllers/assetController');
const rental = require('../controllers/rentalController');
const maintenance = require('../controllers/maintenanceController');

const router = Router();

router.get('/assets', requirePermission('equipment', 'read'), asset.list);
router.post('/assets', requirePermission('equipment', 'write'), asset.create);
router.get('/assets/qr/:serialNumber', requirePermission('equipment', 'read'), asset.getByQr);
router.get('/assets/:id/qr', requirePermission('equipment', 'read'), asset.qr);
router.get('/assets/:id/qr.png', requirePermission('equipment', 'read'), asset.qrImage);
router.get('/assets/:id', requirePermission('equipment', 'read'), asset.get);
router.patch('/assets/:id', requirePermission('equipment', 'write'), asset.update);

router.post('/contracts', requirePermission('equipment', 'write'), rental.createContract);
router.get('/contracts', requirePermission('equipment', 'read'), rental.listContracts);
router.get('/contracts/:id', requirePermission('equipment', 'read'), rental.getContract);

router.post('/reservations', requirePermission('equipment', 'write'), rental.createReservation);
router.get('/reservations', requirePermission('equipment', 'read'), rental.listReservations);

router.post('/sessions/check-in', requirePermission('equipment', 'write'), rental.checkIn);
router.get('/sessions', requirePermission('equipment', 'read'), rental.listSessions);
router.get('/sessions/:id', requirePermission('equipment', 'read'), rental.getSession);
router.post('/sessions/:id/check-out', requirePermission('equipment', 'write'), rental.checkOut);

router.post('/maintenance/orders', requirePermission('equipment', 'admin'), maintenance.create);
router.get('/maintenance/orders', requirePermission('equipment', 'read'), maintenance.list);
router.post('/maintenance/orders/:id/start', requirePermission('equipment', 'admin'), maintenance.start);
router.post('/maintenance/orders/:id/complete', requirePermission('equipment', 'admin'), maintenance.complete);
router.post('/maintenance/orders/:id/cancel', requirePermission('equipment', 'admin'), maintenance.cancel);

module.exports = router;
