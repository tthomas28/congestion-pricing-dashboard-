jest.mock('node-fetch');
const fetch = require('node-fetch');
const { socrataQuery } = require('../scripts/utils/socrata');

describe('socrataQuery', () => {
  beforeEach(() => fetch.mockClear());

  it('builds the correct URL and returns parsed JSON', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ value: '42' }],
    });

    const result = await socrataQuery('data.ny.gov', 'abc1-defg', {
      '$limit': '10',
      '$where': "month='2025-01'",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('data.ny.gov/resource/abc1-defg.json');
    expect(calledUrl).toContain('%24limit=10');
    expect(result).toEqual([{ value: '42' }]);
  });

  it('throws on non-OK response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(socrataQuery('data.ny.gov', 'bad-id', {})).rejects.toThrow('404');
  });

  it('adds X-App-Token header when SOCRATA_APP_TOKEN env var is set', async () => {
    process.env.SOCRATA_APP_TOKEN = 'test-token';
    fetch.mockResolvedValue({ ok: true, json: async () => [] });

    await socrataQuery('data.ny.gov', 'abc1-defg', {});

    const calledOptions = fetch.mock.calls[0][1];
    expect(calledOptions.headers['X-App-Token']).toBe('test-token');
    delete process.env.SOCRATA_APP_TOKEN;
  });
});
