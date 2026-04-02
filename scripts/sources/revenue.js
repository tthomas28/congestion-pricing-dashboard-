const { socrataQuery } = require('../utils/socrata');

// NOTE: No public Socrata dataset for CRZ revenue exists on data.ny.gov as of April 2025.
// This will fail gracefully (Promise.allSettled in orchestrator returns null → revenue section hidden).
// Update DATASET_ID when MTA publishes the dataset.
const DATASET_ID = '9jsb-u6ij'; // placeholder — replace when MTA publishes revenue dataset

async function fetchRevenue() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(transaction_date) AS month, sum(net_revenue) AS net_revenue',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "transaction_date >= '2025-01-01'",
  });

  const byMonth = rows.map(r => ({
    month: r.month.slice(0, 7),
    millions: parseFloat((parseInt(r.net_revenue, 10) / 1_000_000).toFixed(1)),
  }));

  const totalMillions = parseFloat(
    byMonth.reduce((sum, r) => sum + r.millions, 0).toFixed(1)
  );

  if (!byMonth.length) throw new Error('Revenue API returned no rows');

  return {
    updatedAt: byMonth[byMonth.length - 1].month,
    totalMillions,
    byMonth,
  };
}

module.exports = { fetchRevenue };
