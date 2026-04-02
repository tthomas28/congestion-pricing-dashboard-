jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchTraffic } = require('../scripts/sources/traffic');

const MOCK_ROWS = [
  { month: '2025-01-01T00:00:00.000', total_crossings: '14850000' },
  { month: '2025-02-01T00:00:00.000', total_crossings: '14025000' }, // treated as current partial month
];

describe('fetchTraffic', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('uses MTA-reported reductionPct (not computed from baseline)', async () => {
    const result = await fetchTraffic();
    expect(result.reductionPct).toBe(8.5);
    expect(result.reductionNote).toMatch(/MTA/);
  });

  it('byMonth excludes the last (partial) month', async () => {
    const result = await fetchTraffic();
    expect(result.byMonth).toHaveLength(1);
    expect(result.byMonth[0].month).toBe('2025-01');
    expect(result.byMonth.find(m => m.month === '2025-02')).toBeUndefined();
  });

  it('totalEntriesSinceStart sums completed months only', async () => {
    const result = await fetchTraffic();
    expect(result.totalEntriesSinceStart).toBe(14_850_000);
  });

  it('updatedAt is the last completed month', async () => {
    const result = await fetchTraffic();
    expect(result.updatedAt).toBe('2025-01');
  });
});
