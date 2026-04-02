jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchRevenue } = require('../scripts/sources/revenue');

const MOCK_ROWS = [
  { month: '2025-01', net_revenue: '45200000' },
  { month: '2025-02', net_revenue: '47800000' },
  { month: '2025-03', net_revenue: '49100000' },
];

describe('fetchRevenue', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('computes totalMillions from all monthly rows', async () => {
    const result = await fetchRevenue();
    expect(result.totalMillions).toBeCloseTo(142.1, 1);
  });

  it('returns byMonth with millions rounded to 1 decimal', async () => {
    const result = await fetchRevenue();
    expect(result.byMonth).toHaveLength(3);
    expect(result.byMonth[0]).toEqual({ month: '2025-01', millions: 45.2 });
    expect(result.byMonth[1]).toEqual({ month: '2025-02', millions: 47.8 });
  });

  it('sets updatedAt to latest month', async () => {
    const result = await fetchRevenue();
    expect(result.updatedAt).toBe('2025-03');
  });
});
