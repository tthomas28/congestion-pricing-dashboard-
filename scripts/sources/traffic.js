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

  // Estimate total avoided entries since the program launch (Jan 9, 2025).
  // The CRZ dataset has no pre-CP baseline, so we use the MTA/NYT-reported
  // average of ~73k fewer daily entries as the per-day avoidance rate.
  const CP_START_DATE = new Date('2025-01-09');
  const [ly, lm] = latest.month.split('-').map(Number);
  const dataThrough = new Date(ly, lm, 0); // last day of the final completed month
  const daysSinceStart = Math.round((dataThrough - CP_START_DATE) / (1000 * 60 * 60 * 24));
  const estimatedTotalAvoided = daysSinceStart * 73_000;

  return {
    updatedAt: latest.month,
    reductionPct: latestYoy?.reductionPct ?? null,
    reductionNote: latestYoy
      ? `${latestYoy.month} vs ${latestYoy.priorMonth} (year-over-year)`
      : null,
    estimatedTotalAvoided,
    byMonth: completedMonths,
  };
}

module.exports = { fetchTraffic };
