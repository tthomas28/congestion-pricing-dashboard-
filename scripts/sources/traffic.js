const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 't6yz-b64h'; // data.ny.gov — MTA Congestion Relief Zone Vehicle Entries: Beginning 2025

// Pre-CP baseline: MTA-reported average monthly CRZ-equivalent volume before January 5, 2025.
// Source: MTA Congestion Pricing 3-Month Report (March 2025) — ~16.5M crossings/month.
// Update this constant if MTA publishes a revised baseline figure.
const PRE_CP_BASELINE_MONTHLY = 16_500_000;

async function fetchTraffic() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(toll_date) AS month, sum(crz_entries) AS total_crossings',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "toll_date >= '2025-01-01'",
  });

  if (!rows.length) throw new Error('Traffic API returned no rows');

  const byMonth = rows.map(r => ({
    month: r.month.slice(0, 7),
    count: parseInt(r.total_crossings, 10),
    reductionPct: parseFloat(
      (((PRE_CP_BASELINE_MONTHLY - parseInt(r.total_crossings, 10)) / PRE_CP_BASELINE_MONTHLY) * 100).toFixed(2)
    ),
  }));

  // Exclude the current (partial) month from the reduction calculation
  const completedMonths = byMonth.slice(0, -1);
  const latest = completedMonths.length ? completedMonths[completedMonths.length - 1] : byMonth[byMonth.length - 1];

  const reductionPct = parseFloat(
    (((PRE_CP_BASELINE_MONTHLY - latest.count) / PRE_CP_BASELINE_MONTHLY) * 100).toFixed(2)
  );

  return {
    updatedAt: latest.month,
    baselineMonthlyAvg: PRE_CP_BASELINE_MONTHLY,
    reductionPct,
    totalVehiclesAvoided: byMonth.reduce(
      (sum, r) => sum + Math.max(0, PRE_CP_BASELINE_MONTHLY - r.count),
      0
    ),
    byMonth,
  };
}

module.exports = { fetchTraffic };
