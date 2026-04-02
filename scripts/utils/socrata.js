const fetch = require('node-fetch');

async function socrataQuery(domain, datasetId, params = {}) {
  const url = new URL(`https://${domain}/resource/${datasetId}.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = {};
  if (process.env.SOCRATA_APP_TOKEN) {
    headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Socrata ${res.status} — ${url}`);
  return res.json();
}

module.exports = { socrataQuery };
