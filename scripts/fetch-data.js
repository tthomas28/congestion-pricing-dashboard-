const fs = require('fs');
const path = require('path');

const { fetchTraffic }     = require('./sources/traffic');
const { fetchRevenue }     = require('./sources/revenue');
const { fetchSpeeds }      = require('./sources/speeds');
const { fetchRidership }   = require('./sources/ridership');
const { fetchSafety }      = require('./sources/safety');
const { fetchAirQuality }  = require('./sources/air-quality');
const { fetchNews }        = require('./sources/news');

async function main() {
  console.log('Fetching data...');

  const outPath = path.join(__dirname, '..', 'data', 'latest.json');

  // Load previous data so we can fall back to stale values if a fetch fails
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  } catch {}

  const [traffic, revenue, speeds, ridership, safety, airQuality, news] =
    await Promise.allSettled([
      fetchTraffic(),
      fetchRevenue(),
      fetchSpeeds(),
      fetchRidership(),
      fetchSafety(),
      fetchAirQuality(),
      fetchNews(),
    ]);

  function unwrap(result, label, fallback = null) {
    if (result.status === 'fulfilled') return result.value;
    const reason = result.reason?.message ?? result.reason;
    console.warn(`WARN: ${label} failed — using stale data. Reason: ${reason}`);
    return fallback ?? null;
  }

  // Merge airQuality into safety so the frontend accesses data.safety.airQuality consistently.
  // If safety failed, fall back to the previous safety object (which already contains airQuality).
  const safetyData = unwrap(safety, 'safety', prev.safety);
  const airQualityData = unwrap(airQuality, 'airQuality');
  if (safetyData && airQualityData) safetyData.airQuality = airQualityData;

  const payload = {
    updatedAt: new Date().toISOString(),
    traffic:   unwrap(traffic,   'traffic',   prev.traffic),
    revenue:   unwrap(revenue,   'revenue',   prev.revenue),
    speeds:    unwrap(speeds,    'speeds',    prev.speeds),
    ridership: unwrap(ridership, 'ridership', prev.ridership),
    safety:    safetyData,
    news:      unwrap(news,      'news',      prev.news) ?? [],
    revenueAllocation: null,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Written: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
