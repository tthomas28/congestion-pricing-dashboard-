const fetch = require('node-fetch');

async function socrataQuery(domain, datasetId, params = {}, { timeoutMs = 20000 } = {}) {
  const url = new URL(`https://${domain}/resource/${datasetId}.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = {};
  if (process.env.SOCRATA_APP_TOKEN) {
    headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Socrata ${res.status} — ${url}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Socrata timeout after ${timeoutMs}ms — ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { socrataQuery };
