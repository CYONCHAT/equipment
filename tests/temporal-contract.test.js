process.env.NODE_ENV = 'test';
process.env.INTEGRATION_MODE = 'live';
process.env.AGEND_SERVICE_URL = 'http://agend.test';

jest.mock('../src/services/integrationClient', () => ({
  fetchJson: jest.fn(),
}));

jest.mock('../src/models', () => ({
  sequelize: {},
  EquipmentAsset: { findOne: jest.fn() },
  RentalContract: { findOne: jest.fn() },
  EquipmentReservation: { findOne: jest.fn(), findOrCreate: jest.fn() },
  RentalSession: {},
  RentalUsageRecord: {},
  EquipmentInspection: {},
  EquipmentMaintenanceOrder: {},
}));

const { fetchJson } = require('../src/services/integrationClient');
const { agend } = require('../src/services/integrationServices');
const { createReservation } = require('../src/services/rentalService');
const { EquipmentAsset, RentalContract, EquipmentReservation } = require('../src/models');

const context = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  userId: '44444444-4444-4444-8444-444444444444',
};

describe('Equipment → Agend contrato temporal', () => {
  beforeEach(() => {
    fetchJson.mockReset();
    EquipmentAsset.findOne.mockReset();
    RentalContract.findOne.mockReset();
    EquipmentReservation.findOne.mockReset();
    EquipmentReservation.findOrCreate.mockReset();
  });

  test('desencapsula appointment e preserva appointmentDate e duration', async () => {
    fetchJson.mockResolvedValue({ data: { appointment: { id: 'appointment-001', status: 'confirmed', appointmentDate: '2026-08-14T10:00:00.000Z', duration: 90 } } });

    const appointment = await agend.getReservation('appointment-001', { context });

    expect(appointment).toEqual({ id: 'appointment-001', status: 'confirmed', appointmentDate: '2026-08-14T10:00:00.000Z', duration: 90 });
    expect(fetchJson).toHaveBeenCalledWith('http://agend.test', '/api/appointments/appointment-001', expect.objectContaining({ method: 'GET', context }));
  });

  test('usa a janela oficial do Agend mesmo quando o cliente envia horários diferentes', async () => {
    fetchJson.mockResolvedValue({ data: { appointment: { id: 'appointment-002', status: 'confirmed', appointmentDate: '2026-08-14T10:00:00.000Z', duration: 120 } } });
    RentalContract.findOne.mockResolvedValue({ id: 'contract-001' });
    EquipmentAsset.findOne.mockResolvedValue({ id: 'asset-001' });
    EquipmentReservation.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const reservation = {
      id: 'reservation-001',
      contractId: 'contract-001',
      toJSON: () => ({ id: 'reservation-001', contractId: 'contract-001' }),
    };
    EquipmentReservation.findOrCreate.mockResolvedValue([reservation, true]);

    await createReservation({
      contractId: 'contract-001',
      assetId: 'asset-001',
      agendReservationId: 'appointment-002',
      scheduledStart: new Date('2026-08-14T12:00:00.000Z'),
      scheduledEnd: new Date('2026-08-14T13:00:00.000Z'),
      status: 'CONFIRMED',
    }, context, 'equipment:reservation:appointment-002');

    const defaults = EquipmentReservation.findOrCreate.mock.calls[0][0].defaults;
    expect(defaults.scheduledStart.toISOString()).toBe('2026-08-14T10:00:00.000Z');
    expect(defaults.scheduledEnd.toISOString()).toBe('2026-08-14T12:00:00.000Z');
  });
});
