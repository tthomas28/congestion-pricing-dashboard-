const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 't6yz-b64h'; // data.ny.gov — MTA Congestion Relief Zone Vehicle Entries: Beginning 2025

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
  const byMonthMap = Object.fromEntries(completedMonths.map(r => [r.month, r.count]));

  // Year-over-year: find the most recent completed month that also has data 12 months prior
  const yoyMonths = completedMonths
    .map(r => {
      const [y, m] = r.month.split('-').map(Number);
      const priorKey = `${y - 1}-${String(m).padStart(2, '0')}`;
      const priorCount = byMonthMap[priorKey];
      if (priorCount == null) return null;
      return {
        month: r.month,
        priorMonth: priorKey,
        count: r.count,
        priorCount,
        reductionPct: parseFloat((((priorCount - r.count) / priorCount) * 100).toFixed(1)),
      };
    })
    .filter(Boolean);

  const latestYoy = yoyMonths.length ? yoyMonths[yoyMonths.length - 1] : null;
  const latest = completedMonths[completedMonths.length - 1];

  const totalEntriesAvoidedYoy = yoyMonths.reduce((sum, r) => sum + (r.priorCount - r.count), 0);
  const yoyPeriod = yoyMonths.length
    ? `${yoyMonths[0].month}–${yoyMonths[yoyMonths.length - 1].month}`
    : null;

  return {
    updatedAt: latest.month,
    reductionPct: latestYoy?.reductionPct ?? null,
    reductionNote: latestYoy
      ? `${latestYoy.month} vs ${latestYoy.priorMonth} (year-over-year)`
      : null,
    totalEntriesAvoidedYoy,
    yoyPeriod,
    byMonth: completedMonths,
  };
}

module.exports = { fetchTraffic };
