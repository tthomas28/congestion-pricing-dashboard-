jest.mock('node-fetch');
const fetch = require('node-fetch');
const { parseNewsRss } = require('../scripts/sources/news');

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>NYC Congestion Pricing Shows Strong Results</title>
    <link>https://example.com/story1</link>
    <pubDate>Wed, 01 Jan 2025 12:00:00 GMT</pubDate>
    <source>The New York Times</source>
  </item>
  <item>
    <title>Congestion Pricing Revenue Tops Projections</title>
    <link>https://example.com/story2</link>
    <pubDate>Mon, 15 Jan 2025 09:00:00 GMT</pubDate>
    <source>Gothamist</source>
  </item>
</channel></rss>`;

describe('parseNewsRss', () => {
  it('extracts headline, url, date, and publication from items', () => {
    const items = parseNewsRss(MOCK_RSS);
    expect(items).toHaveLength(2);
    expect(items[0].headline).toBe('NYC Congestion Pricing Shows Strong Results');
    expect(items[0].url).toBe('https://example.com/story1');
    expect(items[0].date).toBe('2025-01-01');
    expect(items[1].headline).toBe('Congestion Pricing Revenue Tops Projections');
  });
});
