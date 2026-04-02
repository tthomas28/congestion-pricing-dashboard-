jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchSafety } = require('../scripts/sources/safety');

describe('fetchSafety', () => {
  it('computes accident and fatality reductions vs prior year', async () => {
    socrataQuery
      // First call: crashes current year (CP era)
      .mockResolvedValueOnce([{ total_crashes: '4200', total_injuries: '3100', total_fatalities: '12' }])
      // Second call: crashes prior year same period
      .mockResolvedValueOnce([{ total_crashes: '4950', total_injuries: '3600', total_fatalities: '19' }])
      // Third call: 311 noise current
      .mockResolvedValueOnce([{ complaint_count: '3800' }])
      // Fourth call: 311 noise prior year
      .mockResolvedValueOnce([{ complaint_count: '4900' }]);

    const result = await fetchSafety();

    expect(result.accidents.currentYearCount).toBe(4200);
    expect(result.accidents.priorYearCount).toBe(4950);
    expect(result.accidents.reductionPct).toBeCloseTo(15.15, 1);

    expect(result.pedestrianFatalities.currentYearCount).toBe(12);
    expect(result.pedestrianFatalities.priorYearCount).toBe(19);

    expect(result.noiseComplaints.currentCount).toBe(3800);
    expect(result.noiseComplaints.reductionPct).toBeCloseTo(22.45, 1);
  });
});
