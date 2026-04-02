jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchTraffic } = require('../scripts/sources/traffic');

const MOCK_ROWS = [
  { month: '2024-11', total_crossings: '880000' },
  { month: '2024-12', total_crossings: '855000' },
  { month: '2025-01', total_crossings: '762000' },
  { month: '2025-02', total_crossings: '748000' },
];

describe('fetchTraffic', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('returns totalVehiclesAvoided and reductionPct relative to Dec 2024 baseline', async () => {
    const result = await fetchTraffic();
    // baseline = avg of Nov+Dec 2024 = (880000+855000)/2 = 867500
    expect(result.baselineMonthlyAvg).toBe(867500);
    expect(result.reductionPct).toBeCloseTo(13.78, 1);
    expect(result.byMonth).toHaveLength(2); // only CP months (2025+)
    expect(result.byMonth[0].month).toBe('2025-01');
  });

  it('byMonth entries include count and reductionPct', async () => {
    const result = await fetchTraffic();
    const jan = result.byMonth.find(m => m.month === '2025-01');
    expect(jan.count).toBe(762000);
    expect(jan.reductionPct).toBeCloseTo(12.17, 1);
  });

  it('sets updatedAt to the latest month in the dataset', async () => {
    const result = await fetchTraffic();
    expect(result.updatedAt).toBe('2025-02');
  });
});
