jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchAirQuality } = require('../scripts/sources/air-quality');

describe('fetchAirQuality', () => {
  it('finds latest PM2.5 value and baseline, computes improvement', async () => {
    socrataQuery.mockResolvedValue([
      { name: 'Fine Particulate Matter (PM2.5)', geo_place_name: 'Manhattan', data_value: '9.8', start_date: '2024-01-01' },
      { name: 'Fine Particulate Matter (PM2.5)', geo_place_name: 'Manhattan', data_value: '8.4', start_date: '2025-04-01' },
    ]);

    const result = await fetchAirQuality();
    expect(result.before).toBe(9.8);
    expect(result.after).toBe(8.4);
    expect(result.improvementPct).toBeCloseTo(14.29, 1);
    expect(result.metric).toContain('PM2.5');
  });
});
