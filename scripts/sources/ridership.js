const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'xfre-bxip'; // data.ny.gov — MTA Monthly Ridership/Traffic Data: Beginning January 2008
const CP_START = '2025-01';

async function fetchRidership() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'Month AS month, Ridership AS total_ridership',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "Agency = 'Subway' AND Month >= '2024-01-01'",
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
