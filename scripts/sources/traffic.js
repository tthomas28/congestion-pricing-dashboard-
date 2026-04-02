const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 't6u2-gbxz'; // data.ny.gov — MTA Congestion Relief Zone Vehicle Crossings
const CP_START = '2025-01';

async function fetchTraffic() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(toll_date) AS month, sum(crz_entries) AS total_crossings',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "toll_date >= '2024-11-01'",
  });

  const parsed = rows.map(r => ({
    month: r.month.slice(0, 7),
    count: parseInt(r.total_crossings, 10),
  }));

  const preCp = parsed.filter(r => r.month < CP_START);
  const postCp = parsed.filter(r => r.month >= CP_START);

  if (!preCp.length) throw new Error('Traffic API returned no pre-CP baseline rows');
  if (!postCp.length) throw new Error('Traffic API returned no CP-era rows');

  const baselineMonthlyAvg = Math.round(
    preCp.reduce((sum, r) => sum + r.count, 0) / preCp.length
  );

  const latest = postCp[postCp.length - 1];
  const reductionPct = parseFloat(
    (((baselineMonthlyAvg - latest.count) / baselineMonthlyAvg) * 100).toFixed(2)
  );

  const byMonth = postCp.map(r => ({
    month: r.month,
    count: r.count,
    reductionPct: parseFloat(
      (((baselineMonthlyAvg - r.count) / baselineMonthlyAvg) * 100).toFixed(2)
    ),
  }));

  return {
    updatedAt: latest.month,
    baselineMonthlyAvg,
    reductionPct,
    totalVehiclesAvoided: postCp.reduce(
      (sum, r) => sum + (baselineMonthlyAvg - r.count),
      0
    ),
    byMonth,
  };
}

module.exports = { fetchTraffic };
