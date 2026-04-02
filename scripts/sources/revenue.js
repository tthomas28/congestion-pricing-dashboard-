const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = '9jsb-u6ij'; // data.ny.gov — MTA CP Revenue; verify and update if needed

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
