jest.mock('fs');
const fs = require('fs');
const { fetchRevenue } = require('../scripts/sources/revenue');

const MOCK_OVERRIDE = {
  _note: 'Test data',
  byMonth: [
    { month: '2025-01', millions: 45.2 },
    { month: '2025-02', millions: 47.8 },
    { month: '2025-03', millions: 49.1 },
  ],
};

describe('fetchRevenue', () => {
  beforeEach(() => {
    fs.readFileSync.mockReturnValue(JSON.stringify(MOCK_OVERRIDE));
  });

  it('computes totalMillions from all monthly rows', async () => {
    const result = await fetchRevenue();
    expect(result.totalMillions).toBeCloseTo(142.1, 1);
  });

  it('returns byMonth directly from override file', async () => {
    const result = await fetchRevenue();
    expect(result.byMonth).toHaveLength(3);
    expect(result.byMonth[0]).toEqual({ month: '2025-01', millions: 45.2 });
    expect(result.byMonth[1]).toEqual({ month: '2025-02', millions: 47.8 });
  });

  it('sets updatedAt to latest month in override', async () => {
    const result = await fetchRevenue();
    expect(result.updatedAt).toBe('2025-03');
  });

  it('throws when byMonth is empty', async () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ byMonth: [] }));
    await expect(fetchRevenue()).rejects.toThrow('no byMonth entries');
  });
});
