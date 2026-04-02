jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchTraffic } = require('../scripts/sources/traffic');

// Two full years of data so year-over-year comparison is possible
const MOCK_ROWS = [
  { month: '2025-01-01T00:00:00.000', total_crossings: '14000000' },
  { month: '2025-02-01T00:00:00.000', total_crossings: '14000000' },
  { month: '2026-01-01T00:00:00.000', total_crossings: '13000000' },
  { month: '2026-02-01T00:00:00.000', total_crossings: '12600000' }, // current partial month — excluded
];

describe('fetchTraffic', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('computes reductionPct as year-over-year for the most recent completed month', async () => {
    const result = await fetchTraffic();
    // Jan 2026 (13M) vs Jan 2025 (14M): (14M-13M)/14M * 100 = 7.1%
    expect(result.reductionPct).toBeCloseTo(7.1, 1);
    expect(result.reductionNote).toMatch(/2026-01 vs 2025-01/);
  });

  it('byMonth excludes the current partial month', async () => {
    const result = await fetchTraffic();
    expect(result.byMonth.find(m => m.month === '2026-02')).toBeUndefined();
    expect(result.byMonth).toHaveLength(3);
  });

  it('totalEntriesSinceStart sums all completed months', async () => {
    const result = await fetchTraffic();
    expect(result.totalEntriesSinceStart).toBe(14_000_000 + 14_000_000 + 13_000_000);
  });

  it('updatedAt is the last completed month', async () => {
    const result = await fetchTraffic();
    expect(result.updatedAt).toBe('2026-01');
  });
});
