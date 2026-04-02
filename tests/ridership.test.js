jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchRidership } = require('../scripts/sources/ridership');

const MOCK_ROWS = [
  { month: '2024-01', total_ridership: '182000000' },
  { month: '2024-02', total_ridership: '178000000' },
  { month: '2025-01', total_ridership: '192000000' },
  { month: '2025-02', total_ridership: '188000000' },
];

describe('fetchRidership', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('returns byMonth for CP era only with priorYear comparison', async () => {
    const result = await fetchRidership();
    expect(result.byMonth).toHaveLength(2);
    const jan = result.byMonth.find(m => m.month === '2025-01');
    expect(jan.ridersMillions).toBeCloseTo(192, 0);
    expect(jan.priorYearMillions).toBeCloseTo(182, 0);
  });

  it('sums totalSinceStartMillions for CP era', async () => {
    const result = await fetchRidership();
    expect(result.totalSinceStartMillions).toBeCloseTo(380, 0);
  });

  it('sums priorYearSamePeriodMillions for matching prior-year months', async () => {
    const result = await fetchRidership();
    expect(result.priorYearSamePeriodMillions).toBeCloseTo(360, 0);
  });
});
