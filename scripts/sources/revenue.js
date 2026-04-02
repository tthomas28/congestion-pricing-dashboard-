const fs = require('fs');
const path = require('path');

// No public Socrata dataset for CRZ revenue exists as of April 2025.
// We fall back to a manually maintained override file populated from MTA Board reports.
// When MTA publishes a dataset, replace this with a socrataQuery call.
const OVERRIDE_PATH = path.join(__dirname, '..', '..', 'data', 'revenue-override.json');

async function fetchRevenue() {
  const override = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));

  const byMonth = override.byMonth;
  if (!byMonth || !byMonth.length) throw new Error('Revenue override file has no byMonth entries');

  const totalMillions = parseFloat(
    byMonth.reduce((sum, r) => sum + r.millions, 0).toFixed(1)
  );

  return {
    updatedAt: byMonth[byMonth.length - 1].month,
    totalMillions,
    byMonth,
    note: override._note || null,
  };
}

module.exports = { fetchRevenue };
