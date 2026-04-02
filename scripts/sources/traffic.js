const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 't6yz-b64h'; // data.ny.gov — MTA Congestion Relief Zone Vehicle Entries: Beginning 2025

// MTA-reported average % reduction in vehicle entries since CP launched.
// Source: MTA Congestion Pricing 3-Month Progress Report (April 2025).
// A flat monthly baseline doesn't work across seasons (spring/summer traffic
// naturally exceeds a January-derived baseline), so we use the MTA's published
// figure for the summary stat and show raw monthly counts in the chart.
const MTA_REPORTED_REDUCTION_PCT = 8.5;

async function fetchTraffic() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(toll_date) AS month, sum(crz_entries) AS total_crossings',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "toll_date >= '2025-01-01'",
  });

  if (!rows.length) throw new Error('Traffic API returned no rows');

  const allMonths = rows.map(r => ({
    month: r.month.slice(0, 7),
    count: parseInt(r.total_crossings, 10),
  }));

  // Drop the current partial month from the chart
  const completedMonths = allMonths.slice(0, -1);
  const latest = completedMonths[completedMonths.length - 1];

  return {
    updatedAt: latest.month,
    reductionPct: MTA_REPORTED_REDUCTION_PCT,
    reductionNote: 'Source: MTA 3-Month Progress Report (Apr 2025)',
    totalEntriesSinceStart: completedMonths.reduce((sum, r) => sum + r.count, 0),
    byMonth: completedMonths,
  };
}

module.exports = { fetchTraffic };
