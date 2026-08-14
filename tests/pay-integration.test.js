process.env.NODE_ENV = 'test';
process.env.INTEGRATION_MODE = 'live';
process.env.PAY_SERVICE_URL = 'http://pay.test';
process.env.INTEGRATION_SERVICE_KEY = 'equipment-test-service-key';

jest.mock('../src/services/integrationClient', () => ({
  fetchJson: jest.fn(),
}));

const { fetchJson } = require('../src/services/integrationClient');
const { pay } = require('../src/services/integrationServices');

describe('Equipment → Pay Smart Checkout', () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  test('resolve o estabelecimento do tenant e envia checkout com reference_id único', async () => {
    fetchJson
      .mockResolvedValueOnce({ data: [{ id: 'pay-establishment-001' }] })
      .mockResolvedValueOnce({ data: { id: 'checkout-001', status: 'PENDING' } });

    const result = await pay.collectOverage({
      payload: {
        sourceId: 'rental-session-001',
        title: 'Excedente de locação',
        amountCents: 4500,
      },
      context: {
        authorization: 'Bearer test-token',
        tenantId: '11111111-1111-4111-8111-111111111111',
        sourceSystem: 'equipment',
      },
      idempotencyKey: 'equipment:pay:rental-session-001',
    });

    expect(result).toEqual({ id: 'checkout-001', status: 'PENDING' });
    expect(fetchJson).toHaveBeenNthCalledWith(
      1,
      'http://pay.test',
      '/api/establishments',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchJson).toHaveBeenNthCalledWith(
      2,
      'http://pay.test',
      '/api/establishments/pay-establishment-001/checkout',
      expect.objectContaining({
        method: 'POST',
        body: {
          title: 'Excedente de locação',
          amount: 45,
          reference_id: 'equipment:pay:rental-session-001',
        },
        idempotencyKey: 'equipment:pay:rental-session-001',
      }),
    );
  });
});
