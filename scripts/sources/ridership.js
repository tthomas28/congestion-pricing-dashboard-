const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'wujg-7c2s'; // data.ny.gov — MTA Subway Hourly Ridership
const CP_START = '2025-01';

async function fetchRidership() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(transit_timestamp) AS month, sum(ridership) AS total_ridership',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "transit_timestamp >= '2024-01-01'",
  });

  const parsed = rows.map(r => ({
    month: r.month.slice(0, 7),
    ridersMillions: parseFloat((parseInt(r.total_ridership, 10) / 1_000_000).toFixed(1)),
  }));

  const cpRows = parsed.filter(r => r.month >= CP_START);
  const byMonth = cpRows.map(r => {
    const priorMonth = `${parseInt(r.month.slice(0, 4)) - 1}${r.month.slice(4)}`;
    const priorRow = parsed.find(p => p.month === priorMonth);
    return {
      month: r.month,
      ridersMillions: r.ridersMillions,
      priorYearMillions: priorRow ? priorRow.ridersMillions : null,
    };
  });

  const totalSinceStartMillions = parseFloat(
    cpRows.reduce((s, r) => s + r.ridersMillions, 0).toFixed(1)
  );
  const priorYearSamePeriodMillions = parseFloat(
    byMonth.reduce((s, r) => s + (r.priorYearMillions || 0), 0).toFixed(1)
  );

  return {
    updatedAt: cpRows[cpRows.length - 1]?.month,
    totalSinceStartMillions,
    priorYearSamePeriodMillions,
    byMonth,
  };
}

module.exports = { fetchRidership };
