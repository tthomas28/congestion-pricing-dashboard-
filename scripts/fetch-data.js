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

  function unwrap(result, label) {
    if (result.status === 'fulfilled') return result.value;
    console.error(`WARN: ${label} failed — ${result.reason?.message}`);
    return null;
  }

  // Merge airQuality into safety so the frontend accesses data.safety.airQuality consistently
  const safetyData = unwrap(safety, 'safety');
  const airQualityData = unwrap(airQuality, 'airQuality');
  if (safetyData && airQualityData) safetyData.airQuality = airQualityData;

  const payload = {
    updatedAt: new Date().toISOString(),
    traffic:   unwrap(traffic,   'traffic'),
    revenue:   unwrap(revenue,   'revenue'),
    speeds:    unwrap(speeds,    'speeds'),
    ridership: unwrap(ridership, 'ridership'),
    safety:    safetyData,
    news:      unwrap(news,      'news') ?? [],
    revenueAllocation: null,
  };

  const outPath = path.join(__dirname, '..', 'data', 'latest.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Written: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
