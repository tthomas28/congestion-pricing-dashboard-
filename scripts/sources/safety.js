const { socrataQuery } = require('../utils/socrata');

const CRASH_DATASET = 'h9gi-nx95';     // NYC Open Data — Vision Zero Motor Vehicle Collisions
const COMPLAINTS_DATASET = 'erm2-nwe9'; // NYC Open Data — 311 Service Requests

function reductionPct(current, prior) {
  if (!prior) return null;
  return parseFloat((((prior - current) / prior) * 100).toFixed(2));
}

async function fetchSafety() {
  const now = new Date();
  const cpEnd = now.toISOString();
  const priorEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();

  const [crashCurrent, crashPrior, noise311Current, noise311Prior] = await Promise.all([
    socrataQuery('data.cityofnewyork.us', CRASH_DATASET, {
      '$select': 'count(*) AS total_crashes, sum(number_of_persons_injured) AS total_injuries, sum(number_of_persons_killed) AS total_fatalities',
      '$where': `crash_date >= '2025-01-01T00:00:00.000' AND crash_date < '${cpEnd}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', CRASH_DATASET, {
      '$select': 'count(*) AS total_crashes, sum(number_of_persons_injured) AS total_injuries, sum(number_of_persons_killed) AS total_fatalities',
      '$where': `crash_date >= '2024-01-01T00:00:00.000' AND crash_date < '${priorEnd}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', COMPLAINTS_DATASET, {
      '$select': 'count(*) AS complaint_count',
      '$where': `complaint_type IN ('Noise - Vehicle', 'Noise - Helicopter') AND created_date >= '2025-01-01T00:00:00.000' AND created_date < '${cpEnd}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', COMPLAINTS_DATASET, {
      '$select': 'count(*) AS complaint_count',
      '$where': `complaint_type IN ('Noise - Vehicle', 'Noise - Helicopter') AND created_date >= '2024-01-01T00:00:00.000' AND created_date < '${priorEnd}'`,
      '$limit': '1',
    }),
  ]);

  const cc = crashCurrent[0];
  const cp = crashPrior[0];
  const curCrashes = parseInt(cc.total_crashes, 10);
  const priorCrashes = parseInt(cp.total_crashes, 10);
  const curFatalities = parseInt(cc.total_fatalities, 10);
  const priorFatalities = parseInt(cp.total_fatalities, 10);
  const curNoise = parseInt(noise311Current[0].complaint_count, 10);
  const priorNoise = parseInt(noise311Prior[0].complaint_count, 10);

  return {
    updatedAt: new Date().toISOString().slice(0, 10),
    accidents: {
      currentYearCount: curCrashes,
      priorYearCount: priorCrashes,
      reductionPct: reductionPct(curCrashes, priorCrashes),
    },
    pedestrianFatalities: {
      currentYearCount: curFatalities,
      priorYearCount: priorFatalities,
      reductionPct: reductionPct(curFatalities, priorFatalities),
    },
    noiseComplaints: {
      currentCount: curNoise,
      priorYearCount: priorNoise,
      reductionPct: reductionPct(curNoise, priorNoise),
    },
  };
}

module.exports = { fetchSafety };
