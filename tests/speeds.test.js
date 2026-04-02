jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');

// Mock returns baseline (2024-12) and current (2025-02) rows for two crossings
const MOCK_ROWS = [
  { link_id: '111', speed: '8.2', data_as_of: '2024-12-15T00:00:00.000' },
  { link_id: '111', speed: '12.4', data_as_of: '2025-02-15T00:00:00.000' },
  { link_id: '222', speed: '10.1', data_as_of: '2024-12-15T00:00:00.000' },
  { link_id: '222', speed: '14.8', data_as_of: '2025-02-15T00:00:00.000' },
];

describe('computeSpeedSummary', () => {
  const { computeSpeedSummary, avgMinutesSavedPerTrip } = require('../scripts/sources/speeds');

  const crossingLinks = {
    'Brooklyn Bridge': ['111'],
    'Holland Tunnel': ['222'],
  };

  it('computes before/after mph per crossing', () => {
    const result = computeSpeedSummary(MOCK_ROWS, crossingLinks, '2024-12', '2025-02');
    expect(result[0].name).toBe('Brooklyn Bridge');
    expect(result[0].beforeMph).toBeCloseTo(8.2, 1);
    expect(result[0].afterMph).toBeCloseTo(12.4, 1);
    expect(result[1].name).toBe('Holland Tunnel');
    expect(result[1].afterMph).toBeCloseTo(14.8, 1);
  });

  it('computes avgMinutesSavedPerTrip across all crossings', () => {
    const result = computeSpeedSummary(MOCK_ROWS, crossingLinks, '2024-12', '2025-02');
    const avg = avgMinutesSavedPerTrip(result, 2.5); // assume 2.5 mile avg trip
    expect(avg).toBeGreaterThan(0);
  });
});
