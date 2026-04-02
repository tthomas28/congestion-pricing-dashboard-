const fetch = require('node-fetch');

// Google News RSS — no API key needed
const RSS_URL = 'https://news.google.com/rss/search?q=NYC+congestion+pricing+results&hl=en-US&gl=US&ceid=US:en';

function parseNewsRss(xml) {
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const tagRe = name => new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>|<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`);

  const items = [];
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const get = name => {
      const m = tagRe(name).exec(block);
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    const rawDate = get('pubDate');
    const parsed = rawDate ? new Date(rawDate) : null;
    const date = parsed && !isNaN(parsed) ? parsed.toISOString().slice(0, 10) : '';

    // Extract publication from <source> tag or from title suffix " - Publication"
    let publication = get('source');
    const title = get('title');
    if (!publication && title.includes(' - ')) {
      publication = title.split(' - ').pop().trim();
    }

    items.push({
      headline: title.replace(/ - [^-]+$/, '').trim(),
      url: get('link'),
      date,
      publication,
    });
  }

  return items.slice(0, 10);
}

async function fetchNews() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; dashboard-bot/1.0)' },
  });
  if (!res.ok) throw new Error(`News RSS error: ${res.status}`);
  const xml = await res.text();
  return parseNewsRss(xml);
}

module.exports = { fetchNews, parseNewsRss };
