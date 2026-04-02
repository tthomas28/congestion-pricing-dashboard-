const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'i4gi-tjb9'; // NYC Open Data — DOT Traffic Speeds NBE
const BASELINE_MONTH = '2024-12';

// Fill in correct link_id values after running the one-time lookup.
// These are placeholder IDs — the one-time lookup in the README will correct them.
const CROSSING_LINKS = {
  'Brooklyn Bridge':   ['4616711', '4616712'],
  'Holland Tunnel':    ['4617001', '4617002'],
  'Lincoln Tunnel':    ['4617101', '4617102'],
  'Battery Tunnel':    ['4616901', '4616902'],
  'Queensboro Bridge': ['4616801', '4616802'],
};

function avgSpeed(rows) {
  if (!rows.length) return null;
  return parseFloat(
    (rows.reduce((s, r) => s + parseFloat(r.speed), 0) / rows.length).toFixed(1)
  );
}

function computeSpeedSummary(rows, crossingLinks, baselineMonth, currentMonth) {
  return Object.entries(crossingLinks).map(([name, linkIds]) => {
    const baseRows = rows.filter(r =>
      linkIds.includes(r.link_id) && r.data_as_of.startsWith(baselineMonth)
    );
    const curRows = rows.filter(r =>
      linkIds.includes(r.link_id) && r.data_as_of.startsWith(currentMonth)
    );
    return {
      name,
      beforeMph: avgSpeed(baseRows),
      afterMph: avgSpeed(curRows),
    };
  });
}

function avgMinutesSavedPerTrip(crossings, avgTripMiles = 2.5) {
  const valid = crossings.filter(c => c.beforeMph && c.afterMph);
  if (!valid.length) return 0;
  const totalSaved = valid.reduce((sum, c) => {
    const before = (avgTripMiles / c.beforeMph) * 60;
    const after  = (avgTripMiles / c.afterMph)  * 60;
    return sum + (before - after);
  }, 0);
  return parseFloat((totalSaved / valid.length).toFixed(1));
}

async function fetchSpeeds() {
  const allLinkIds = Object.values(CROSSING_LINKS).flat();
  const idList = allLinkIds.map(id => `'${id}'`).join(',');

  const rows = await socrataQuery('data.cityofnewyork.us', DATASET_ID, {
    '$where': `link_id IN (${idList}) AND data_as_of >= '${BASELINE_MONTH}-01'`,
    '$limit': '5000',
    '$select': 'link_id, speed, data_as_of',
    '$order': 'data_as_of ASC',
  });

  // Determine current month from latest row
  const sorted = rows.slice().sort((a, b) => b.data_as_of.localeCompare(a.data_as_of));
  const currentMonth = sorted.length ? sorted[0].data_as_of.slice(0, 7) : '2025-01';

  const crossings = computeSpeedSummary(rows, CROSSING_LINKS, BASELINE_MONTH, currentMonth);
  const avgSaved = avgMinutesSavedPerTrip(crossings);

  return {
    updatedAt: currentMonth,
    baseline: BASELINE_MONTH,
    crossings,
    avgMinutesSavedPerTrip: avgSaved,
  };
}

module.exports = { fetchSpeeds, computeSpeedSummary, avgMinutesSavedPerTrip };
