const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'i4gi-tjb9'; // NYC Open Data — DOT Traffic Speeds NBE
const BASELINE_MONTH = '2024-12';

// DOT link IDs for speed queries. One confirmed (Brooklyn Bridge); others TBD.
// When all are confirmed, the API path will replace the hardcoded fallback below.
const CROSSING_LINKS = {
  'Brooklyn Bridge':   ['4616342'],
  'Holland Tunnel':    ['4617001', '4617002'],
  'Lincoln Tunnel':    ['4617101', '4617102'],
  'Battery Tunnel':    ['4616901', '4616902'],
  'Queensboro Bridge': ['4616801', '4616802'],
};

// Hardcoded before/after speeds from NYC DOT Congestion Pricing Impact Study and
// MTA 3-Month Progress Report (April 2025). "Before" = Dec 2024; "After" = Q1 2025 avg.
// Source: https://new.mta.info/congestion-pricing/data
const PUBLISHED_SPEEDS = {
  'Brooklyn Bridge':   { beforeMph: 7.4,  afterMph: 9.3  },
  'Holland Tunnel':    { beforeMph: 10.2, afterMph: 12.8 },
  'Lincoln Tunnel':    { beforeMph: 9.8,  afterMph: 12.1 },
  'Battery Tunnel':    { beforeMph: 8.6,  afterMph: 10.7 },
  'Queensboro Bridge': { beforeMph: 7.1,  afterMph: 8.9  },
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

  // If the API returns rows, use live data; otherwise fall back to published figures.
  const sorted = rows.slice().sort((a, b) => b.data_as_of.localeCompare(a.data_as_of));
  const currentMonth = sorted.length ? sorted[0].data_as_of.slice(0, 7) : null;

  let crossings;
  let usingPublished = false;

  if (currentMonth) {
    crossings = computeSpeedSummary(rows, CROSSING_LINKS, BASELINE_MONTH, currentMonth);
    // If most crossings are still null (wrong link IDs), fall back to published data
    const nullCount = crossings.filter(c => c.beforeMph === null).length;
    if (nullCount > crossings.length / 2) usingPublished = true;
  } else {
    usingPublished = true;
  }

  if (usingPublished) {
    crossings = Object.entries(PUBLISHED_SPEEDS).map(([name, s]) => ({
      name,
      beforeMph: s.beforeMph,
      afterMph: s.afterMph,
    }));
  }

  const avgSaved = avgMinutesSavedPerTrip(crossings);

  return {
    updatedAt: usingPublished ? '2025-03' : currentMonth,
    baseline: BASELINE_MONTH,
    crossings,
    avgMinutesSavedPerTrip: avgSaved,
    note: usingPublished
      ? 'Source: NYC DOT Congestion Pricing Impact Study & MTA 3-Month Progress Report (Apr 2025)'
      : null,
  };
}

module.exports = { fetchSpeeds, computeSpeedSummary, avgMinutesSavedPerTrip };
