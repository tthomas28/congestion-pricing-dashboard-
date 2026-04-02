jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchTraffic } = require('../scripts/sources/traffic');

// Realistic mock values matching the actual API response format (ISO timestamps, 7–15M range)
// Pre-CP baseline is hardcoded at 16,500,000 in traffic.js
const MOCK_ROWS = [
  { month: '2025-01-01T00:00:00.000', total_crossings: '14850000' }, // completed — 10% below baseline
  { month: '2025-02-01T00:00:00.000', total_crossings: '14025000' }, // "current" partial month (excluded from latest)
];

describe('fetchTraffic', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('uses hardcoded PRE_CP_BASELINE_MONTHLY as baselineMonthlyAvg', async () => {
    const result = await fetchTraffic();
    expect(result.baselineMonthlyAvg).toBe(16_500_000);
  });

  it('computes reductionPct against hardcoded baseline, using last completed month', async () => {
    const result = await fetchTraffic();
    // last completed month = Jan 2025: (16500000-14850000)/16500000 * 100 = 10.00%
    expect(result.reductionPct).toBeCloseTo(10.0, 1);
    expect(result.updatedAt).toBe('2025-01');
  });

  it('byMonth includes all returned months with count and per-month reductionPct', async () => {
    const result = await fetchTraffic();
    expect(result.byMonth).toHaveLength(2);
    const jan = result.byMonth.find(m => m.month === '2025-01');
    expect(jan.count).toBe(14_850_000);
    expect(jan.reductionPct).toBeCloseTo(10.0, 1);
    const feb = result.byMonth.find(m => m.month === '2025-02');
    expect(feb.reductionPct).toBeCloseTo(15.0, 1);
  });
});
