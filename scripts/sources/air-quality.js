const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'c3uy-2p5r'; // NYC Open Data — Air Quality (DOHMH)
const BASELINE_CUTOFF = '2025-01-01'; // pre-CP = before this date

async function fetchAirQuality() {
  const rows = await socrataQuery('data.cityofnewyork.us', DATASET_ID, {
    '$where': "name = 'Fine Particulate Matter (PM2.5)' AND geo_place_name = 'Manhattan'",
    '$order': 'start_date ASC',
    '$limit': '200',
  });

  const preCp = rows.filter(r => r.start_date < BASELINE_CUTOFF);
  const postCp = rows.filter(r => r.start_date >= BASELINE_CUTOFF);

  const before = parseFloat(preCp[preCp.length - 1]?.data_value);
  const after = parseFloat(postCp[postCp.length - 1]?.data_value);
  const updatedAt = postCp[postCp.length - 1]?.start_date?.slice(0, 10) ?? null;

  const improvementPct = before && after
    ? parseFloat((((before - after) / before) * 100).toFixed(2))
    : null;

  return {
    updatedAt,
    metric: 'PM2.5 Fine Particles (µg/m³) — Manhattan',
    before,
    after,
    improvementPct,
  };
}

module.exports = { fetchAirQuality };
