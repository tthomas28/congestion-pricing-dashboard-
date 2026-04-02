# NYC Congestion Pricing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static single-page dashboard that auto-updates weekly via GitHub Actions, displaying NYC congestion pricing program outcomes for policymakers and advocates.

**Architecture:** A Node.js script (`scripts/fetch-data.js`) runs on a Monday cron via GitHub Actions, calls public Socrata APIs and RSS feeds, assembles all metrics into `data/latest.json`, and commits it back to the repo. `index.html` reads that JSON at load time and renders all charts and stat cards via Chart.js — zero live API calls from the browser.

**Tech Stack:** Node.js 20 + node-fetch v2, Jest 29, HTML/CSS/Vanilla JS, Chart.js 4, GitHub Actions

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Node deps (node-fetch, jest) + test script |
| `scripts/utils/socrata.js` | Shared Socrata HTTP helper |
| `scripts/sources/traffic.js` | Vehicle crossing counts from data.ny.gov |
| `scripts/sources/revenue.js` | CP revenue from data.ny.gov |
| `scripts/sources/speeds.js` | Link speeds from NYC Open Data |
| `scripts/sources/ridership.js` | MTA subway ridership from data.ny.gov |
| `scripts/sources/safety.js` | Vision Zero crashes + 311 noise complaints |
| `scripts/sources/air-quality.js` | DOHMH air quality from NYC Open Data |
| `scripts/sources/news.js` | RSS-based news articles |
| `scripts/fetch-data.js` | Orchestrator — calls all sources, writes latest.json |
| `data/latest.json` | Auto-generated weekly; committed by CI |
| `.github/workflows/update-data.yml` | Monday 9am ET cron workflow |
| `index.html` | Single-page dashboard |
| `css/styles.css` | All styles — navy/white/orange palette, responsive |
| `js/dashboard.js` | Loads latest.json, renders all charts + stat cards |
| `tests/socrata.test.js` | Tests for Socrata helper |
| `tests/traffic.test.js` | Tests for traffic transform logic |
| `tests/revenue.test.js` | Tests for revenue transform logic |
| `tests/speeds.test.js` | Tests for speeds transform logic |
| `tests/ridership.test.js` | Tests for ridership transform logic |
| `tests/safety.test.js` | Tests for safety transform logic |
| `tests/air-quality.test.js` | Tests for air quality transform logic |
| `tests/news.test.js` | Tests for news RSS parsing |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `scripts/utils/socrata.js` (empty)
- Create: `scripts/sources/` (directory)
- Create: `data/.gitkeep`

- [ ] **Step 1: Initialize the project directory**

```bash
cd ~/Documents/congestion-pricing-dashboard
npm init -y
```

Expected: `package.json` created.

- [ ] **Step 2: Install dependencies**

```bash
npm install node-fetch@2.7.0
npm install --save-dev jest@29
```

Expected: `node_modules/` created, `package.json` updated with deps.

- [ ] **Step 3: Update package.json with test script and node version**

Edit `package.json` to match exactly:

```json
{
  "name": "nyc-congestion-pricing-dashboard",
  "version": "1.0.0",
  "description": "NYC Congestion Pricing Results Dashboard",
  "scripts": {
    "fetch": "node scripts/fetch-data.js",
    "test": "jest --testPathPattern=tests/"
  },
  "dependencies": {
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
.env
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p scripts/utils scripts/sources tests css js data
touch data/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git init
git add package.json package-lock.json .gitignore data/.gitkeep
git commit -m "chore: scaffold project with npm deps"
```

---

## Task 2: Socrata API Utility

**Files:**
- Create: `scripts/utils/socrata.js`
- Create: `tests/socrata.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/socrata.test.js`:

```javascript
jest.mock('node-fetch');
const fetch = require('node-fetch');
const { socrataQuery } = require('../scripts/utils/socrata');

describe('socrataQuery', () => {
  beforeEach(() => fetch.mockClear());

  it('builds the correct URL and returns parsed JSON', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ value: '42' }],
    });

    const result = await socrataQuery('data.ny.gov', 'abc1-defg', {
      '$limit': '10',
      '$where': "month='2025-01'",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('data.ny.gov/resource/abc1-defg.json');
    expect(calledUrl).toContain('%24limit=10');
    expect(result).toEqual([{ value: '42' }]);
  });

  it('throws on non-OK response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(socrataQuery('data.ny.gov', 'bad-id', {})).rejects.toThrow('404');
  });

  it('adds X-App-Token header when SOCRATA_APP_TOKEN env var is set', async () => {
    process.env.SOCRATA_APP_TOKEN = 'test-token';
    fetch.mockResolvedValue({ ok: true, json: async () => [] });

    await socrataQuery('data.ny.gov', 'abc1-defg', {});

    const calledOptions = fetch.mock.calls[0][1];
    expect(calledOptions.headers['X-App-Token']).toBe('test-token');
    delete process.env.SOCRATA_APP_TOKEN;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/socrata.test.js --no-coverage
```

Expected: FAIL — "Cannot find module '../scripts/utils/socrata'"

- [ ] **Step 3: Implement the utility**

Create `scripts/utils/socrata.js`:

```javascript
const fetch = require('node-fetch');

async function socrataQuery(domain, datasetId, params = {}) {
  const url = new URL(`https://${domain}/resource/${datasetId}.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = {};
  if (process.env.SOCRATA_APP_TOKEN) {
    headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Socrata ${res.status} — ${url}`);
  return res.json();
}

module.exports = { socrataQuery };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/socrata.test.js --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/utils/socrata.js tests/socrata.test.js
git commit -m "feat: add Socrata API utility with tests"
```

---

## Task 3: Traffic Fetcher

Pulls monthly vehicle crossing counts from the MTA Congestion Relief Zone dataset on data.ny.gov (dataset ID `t6u2-gbxz`). Computes reduction vs. pre-CP baseline.

**Note:** Verify dataset ID at https://data.ny.gov — search "MTA Congestion Relief Zone Vehicle Crossings". Update `DATASET_ID` in the source file if different.

**Files:**
- Create: `scripts/sources/traffic.js`
- Create: `tests/traffic.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/traffic.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchTraffic } = require('../scripts/sources/traffic');

const MOCK_ROWS = [
  { month: '2024-11', total_crossings: '880000' },
  { month: '2024-12', total_crossings: '855000' },
  { month: '2025-01', total_crossings: '762000' },
  { month: '2025-02', total_crossings: '748000' },
];

describe('fetchTraffic', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('returns totalVehiclesAvoided and reductionPct relative to Dec 2024 baseline', async () => {
    const result = await fetchTraffic();
    // baseline = avg of Nov+Dec 2024 = (880000+855000)/2 = 867500
    expect(result.baselineMonthlyAvg).toBe(867500);
    expect(result.reductionPct).toBeCloseTo(13.78, 1);
    expect(result.byMonth).toHaveLength(2); // only CP months (2025+)
    expect(result.byMonth[0].month).toBe('2025-01');
  });

  it('byMonth entries include count and reductionPct', async () => {
    const result = await fetchTraffic();
    const jan = result.byMonth.find(m => m.month === '2025-01');
    expect(jan.count).toBe(762000);
    expect(jan.reductionPct).toBeCloseTo(12.17, 1);
  });

  it('sets updatedAt to the latest month in the dataset', async () => {
    const result = await fetchTraffic();
    expect(result.updatedAt).toBe('2025-02');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/traffic.test.js --no-coverage
```

Expected: FAIL — "Cannot find module '../scripts/sources/traffic'"

- [ ] **Step 3: Implement the fetcher**

Create `scripts/sources/traffic.js`:

```javascript
const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 't6u2-gbxz'; // data.ny.gov — MTA Congestion Relief Zone Vehicle Crossings
const CP_START = '2025-01';

async function fetchTraffic() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(toll_date) AS month, sum(crz_entries) AS total_crossings',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "toll_date >= '2024-11-01'",
  });

  const parsed = rows.map(r => ({
    month: r.month.slice(0, 7),
    count: parseInt(r.total_crossings, 10),
  }));

  const preCp = parsed.filter(r => r.month < CP_START);
  const postCp = parsed.filter(r => r.month >= CP_START);

  const baselineMonthlyAvg = Math.round(
    preCp.reduce((sum, r) => sum + r.count, 0) / preCp.length
  );

  const latest = postCp[postCp.length - 1];
  const reductionPct = parseFloat(
    (((baselineMonthlyAvg - latest.count) / baselineMonthlyAvg) * 100).toFixed(2)
  );

  const byMonth = postCp.map(r => ({
    month: r.month,
    count: r.count,
    reductionPct: parseFloat(
      (((baselineMonthlyAvg - r.count) / baselineMonthlyAvg) * 100).toFixed(2)
    ),
  }));

  return {
    updatedAt: latest.month,
    baselineMonthlyAvg,
    reductionPct,
    totalVehiclesAvoided: postCp.reduce(
      (sum, r) => sum + (baselineMonthlyAvg - r.count),
      0
    ),
    byMonth,
  };
}

module.exports = { fetchTraffic };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/traffic.test.js --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/sources/traffic.js tests/traffic.test.js
git commit -m "feat: add traffic vehicle crossings fetcher with tests"
```

---

## Task 4: Revenue Fetcher

MTA publishes CP revenue on data.ny.gov under "MTA Congestion Relief Zone Cashflow" (dataset ID `9jsb-u6ij` — verify at data.ny.gov by searching "MTA Congestion Pricing Revenue"). If the API dataset is unavailable, the fetcher falls back to a manually maintained `data/revenue-override.json`.

**Files:**
- Create: `scripts/sources/revenue.js`
- Create: `tests/revenue.test.js`
- Create: `data/revenue-override.json` (fallback seed)

- [ ] **Step 1: Create the fallback seed file**

Create `data/revenue-override.json` — this file is manually updated if the API isn't available:

```json
{
  "_note": "Manual override — update if API dataset unavailable. Remove entries once API covers them.",
  "byMonth": []
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/revenue.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchRevenue } = require('../scripts/sources/revenue');

const MOCK_ROWS = [
  { month: '2025-01', net_revenue: '45200000' },
  { month: '2025-02', net_revenue: '47800000' },
  { month: '2025-03', net_revenue: '49100000' },
];

describe('fetchRevenue', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('computes totalMillions from all monthly rows', async () => {
    const result = await fetchRevenue();
    expect(result.totalMillions).toBeCloseTo(142.1, 1);
  });

  it('returns byMonth with millions rounded to 1 decimal', async () => {
    const result = await fetchRevenue();
    expect(result.byMonth).toHaveLength(3);
    expect(result.byMonth[0]).toEqual({ month: '2025-01', millions: 45.2 });
    expect(result.byMonth[1]).toEqual({ month: '2025-02', millions: 47.8 });
  });

  it('sets updatedAt to latest month', async () => {
    const result = await fetchRevenue();
    expect(result.updatedAt).toBe('2025-03');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest tests/revenue.test.js --no-coverage
```

Expected: FAIL — "Cannot find module '../scripts/sources/revenue'"

- [ ] **Step 4: Implement the fetcher**

Create `scripts/sources/revenue.js`:

```javascript
const { socrataQuery } = require('../utils/socrata');
const path = require('path');

const DATASET_ID = '9jsb-u6ij'; // data.ny.gov — MTA CP Revenue; verify and update if needed

async function fetchRevenue() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(transaction_date) AS month, sum(net_revenue) AS net_revenue',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "transaction_date >= '2025-01-01'",
  });

  const byMonth = rows.map(r => ({
    month: r.month.slice(0, 7),
    millions: parseFloat((parseInt(r.net_revenue, 10) / 1_000_000).toFixed(1)),
  }));

  const totalMillions = parseFloat(
    byMonth.reduce((sum, r) => sum + r.millions, 0).toFixed(1)
  );

  return {
    updatedAt: byMonth[byMonth.length - 1].month,
    totalMillions,
    byMonth,
  };
}

module.exports = { fetchRevenue };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/revenue.test.js --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add scripts/sources/revenue.js tests/revenue.test.js data/revenue-override.json
git commit -m "feat: add revenue fetcher with fallback override and tests"
```

---

## Task 5: Speed at Crossings Fetcher

Uses NYC Open Data "DOT Traffic Speeds NBE" (dataset `i4gi-tjb9` on `data.cityofnewyork.us`). Filters by link IDs corresponding to each named crossing. Compares current average vs. December 2024 baseline.

**Note:** Run the query below manually once to find the correct `link_id` values for each crossing, then hardcode them in the `CROSSING_LINKS` map.

**Files:**
- Create: `scripts/sources/speeds.js`
- Create: `tests/speeds.test.js`

- [ ] **Step 1: Find link IDs for each crossing (one-time setup)**

Run this in a browser or curl to find link names near each crossing:

```
https://data.cityofnewyork.us/resource/i4gi-tjb9.json?$limit=50&$where=link_name LIKE '%Brooklyn Bridge%'
```

Repeat for Holland Tunnel, Lincoln Tunnel, Battery Tunnel, Queensboro Bridge. Note the `link_id` values for each and fill in `CROSSING_LINKS` in Step 4.

- [ ] **Step 2: Write the failing test**

Create `tests/speeds.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchSpeeds } = require('../scripts/sources/speeds');

// Mock returns baseline (2024-12) and current (2025-02) rows for two crossings
const MOCK_ROWS = [
  { link_id: '111', speed: '8.2', data_as_of: '2024-12-15T00:00:00.000' },
  { link_id: '111', speed: '12.4', data_as_of: '2025-02-15T00:00:00.000' },
  { link_id: '222', speed: '10.1', data_as_of: '2024-12-15T00:00:00.000' },
  { link_id: '222', speed: '14.8', data_as_of: '2025-02-15T00:00:00.000' },
];

jest.mock('../scripts/sources/speeds', () => {
  const actual = jest.requireActual('../scripts/sources/speeds');
  return actual;
}, { virtual: false });

describe('computeSpeedSummary', () => {
  const { computeSpeedSummary } = require('../scripts/sources/speeds');

  const crossingLinks = {
    'Brooklyn Bridge': ['111'],
    'Holland Tunnel': ['222'],
  };

  it('computes before/after mph per crossing', () => {
    const result = computeSpeedSummary(MOCK_ROWS, crossingLinks, '2024-12', '2025-02');
    expect(result[0].name).toBe('Brooklyn Bridge');
    expect(result[0].beforeMph).toBeCloseTo(8.2, 1);
    expect(result[0].afterMph).toBeCloseTo(12.4, 1);
    expect(result[1].name).toBe('Holland Tunnel');
    expect(result[1].afterMph).toBeCloseTo(14.8, 1);
  });

  it('computes avgMinutesSavedPerTrip across all crossings', () => {
    const result = computeSpeedSummary(MOCK_ROWS, crossingLinks, '2024-12', '2025-02');
    // Each crossing improved; avg should be positive
    const { avgMinutesSavedPerTrip } = require('../scripts/sources/speeds');
    const avg = avgMinutesSavedPerTrip(result, 2.5); // assume 2.5 mile avg trip
    expect(avg).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest tests/speeds.test.js --no-coverage
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 4: Implement the fetcher**

Create `scripts/sources/speeds.js`:

```javascript
const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'i4gi-tjb9'; // NYC Open Data — DOT Traffic Speeds NBE
const BASELINE_MONTH = '2024-12';

// Fill in correct link_id values after running the one-time lookup in Task 5 Step 1
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
    '$where': `link_id IN (${idList}) AND (data_as_of >= '${BASELINE_MONTH}-01' AND data_as_of < '${BASELINE_MONTH}-01' OR data_as_of >= '2025-01-01')`,
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/speeds.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/sources/speeds.js tests/speeds.test.js
git commit -m "feat: add crossing speeds fetcher with before/after comparison"
```

---

## Task 6: MTA Ridership Fetcher

Uses data.ny.gov "MTA Subway Hourly Ridership" (dataset `wujg-7c2s`). Aggregates to monthly totals and compares CP era (Jan 2025+) to same months in prior year.

**Files:**
- Create: `scripts/sources/ridership.js`
- Create: `tests/ridership.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/ridership.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchRidership } = require('../scripts/sources/ridership');

const MOCK_ROWS = [
  { month: '2024-01', total_ridership: '182000000' },
  { month: '2024-02', total_ridership: '178000000' },
  { month: '2025-01', total_ridership: '192000000' },
  { month: '2025-02', total_ridership: '188000000' },
];

describe('fetchRidership', () => {
  beforeEach(() => socrataQuery.mockResolvedValue(MOCK_ROWS));

  it('returns byMonth for CP era only with priorYear comparison', async () => {
    const result = await fetchRidership();
    expect(result.byMonth).toHaveLength(2);
    const jan = result.byMonth.find(m => m.month === '2025-01');
    expect(jan.ridersMillions).toBeCloseTo(192, 0);
    expect(jan.priorYearMillions).toBeCloseTo(182, 0);
  });

  it('sums totalSinceStartMillions for CP era', async () => {
    const result = await fetchRidership();
    expect(result.totalSinceStartMillions).toBeCloseTo(380, 0);
  });

  it('sums priorYearSamePeriodMillions for matching prior-year months', async () => {
    const result = await fetchRidership();
    expect(result.priorYearSamePeriodMillions).toBeCloseTo(360, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/ridership.test.js --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement the fetcher**

Create `scripts/sources/ridership.js`:

```javascript
const { socrataQuery } = require('../utils/socrata');

const DATASET_ID = 'wujg-7c2s'; // data.ny.gov — MTA Subway Hourly Ridership
const CP_START = '2025-01';

async function fetchRidership() {
  const rows = await socrataQuery('data.ny.gov', DATASET_ID, {
    '$select': 'date_trunc_ym(transit_timestamp) AS month, sum(ridership) AS total_ridership',
    '$group': 'month',
    '$order': 'month ASC',
    '$limit': '500',
    '$where': "transit_timestamp >= '2024-01-01'",
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/ridership.test.js --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/sources/ridership.js tests/ridership.test.js
git commit -m "feat: add MTA ridership fetcher with prior-year comparison"
```

---

## Task 7: Safety Fetcher (Vision Zero + 311)

Pulls crash data from NYC Open Data Vision Zero dataset (`h9gi-nx95`) and noise/honking 311 complaints (`erm2-nwe9`). Computes year-over-year reductions.

**Files:**
- Create: `scripts/sources/safety.js`
- Create: `tests/safety.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/safety.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchSafety } = require('../scripts/sources/safety');

describe('fetchSafety', () => {
  it('computes accident and fatality reductions vs prior year', async () => {
    socrataQuery
      // First call: crashes current year
      .mockResolvedValueOnce([{ total_crashes: '4200', total_injuries: '3100', total_fatalities: '12' }])
      // Second call: crashes prior year same period
      .mockResolvedValueOnce([{ total_crashes: '4950', total_injuries: '3600', total_fatalities: '19' }])
      // Third call: 311 current
      .mockResolvedValueOnce([{ complaint_count: '3800' }])
      // Fourth call: 311 prior year
      .mockResolvedValueOnce([{ complaint_count: '4900' }]);

    const result = await fetchSafety();

    expect(result.accidents.currentYearCount).toBe(4200);
    expect(result.accidents.priorYearCount).toBe(4950);
    expect(result.accidents.reductionPct).toBeCloseTo(15.15, 1);

    expect(result.pedestrianFatalities.currentYearCount).toBe(12);
    expect(result.pedestrianFatalities.priorYearCount).toBe(19);

    expect(result.noiseComplaints.currentCount).toBe(3800);
    expect(result.noiseComplaints.reductionPct).toBeCloseTo(22.45, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/safety.test.js --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement the fetcher**

Create `scripts/sources/safety.js`:

```javascript
const { socrataQuery } = require('../utils/socrata');

const CRASH_DATASET = 'h9gi-nx95';  // NYC Open Data — Vision Zero Motor Vehicle Collisions
const COMPLAINTS_DATASET = 'erm2-nwe9'; // NYC Open Data — 311 Service Requests

function reductionPct(current, prior) {
  if (!prior) return null;
  return parseFloat((((prior - current) / prior) * 100).toFixed(2));
}

function cpStartDate() { return '2025-01-01T00:00:00.000'; }
function priorYearStart() { return '2024-01-01T00:00:00.000'; }

async function fetchSafety() {
  const now = new Date();
  const cpEnd = now.toISOString();
  const priorEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();

  const [crashCurrent, crashPrior, noise311Current, noise311Prior] = await Promise.all([
    socrataQuery('data.cityofnewyork.us', CRASH_DATASET, {
      '$select': 'count(*) AS total_crashes, sum(number_of_persons_injured) AS total_injuries, sum(number_of_persons_killed) AS total_fatalities',
      '$where': `crash_date >= '${cpStartDate()}' AND crash_date < '${cpEnd}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', CRASH_DATASET, {
      '$select': 'count(*) AS total_crashes, sum(number_of_persons_injured) AS total_injuries, sum(number_of_persons_killed) AS total_fatalities',
      '$where': `crash_date >= '${priorYearStart()}' AND crash_date < '${priorEnd}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', COMPLAINTS_DATASET, {
      '$select': 'count(*) AS complaint_count',
      '$where': `complaint_type IN ('Noise - Vehicle', 'Noise - Helicopter') AND created_date >= '${cpStartDate()}'`,
      '$limit': '1',
    }),
    socrataQuery('data.cityofnewyork.us', COMPLAINTS_DATASET, {
      '$select': 'count(*) AS complaint_count',
      '$where': `complaint_type IN ('Noise - Vehicle', 'Noise - Helicopter') AND created_date >= '${priorYearStart()}' AND created_date < '${priorEnd}'`,
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/safety.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sources/safety.js tests/safety.test.js
git commit -m "feat: add safety fetcher (Vision Zero + 311 noise) with tests"
```

---

## Task 8: Air Quality Fetcher

Uses NYC Open Data "Air Quality" dataset (`c3uy-2p5r` on `data.cityofnewyork.us`). Pulls PM2.5 fine particles for Manhattan and computes improvement vs. pre-CP baseline. Updates quarterly.

**Files:**
- Create: `scripts/sources/air-quality.js`
- Create: `tests/air-quality.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/air-quality.test.js`:

```javascript
jest.mock('../scripts/utils/socrata');
const { socrataQuery } = require('../scripts/utils/socrata');
const { fetchAirQuality } = require('../scripts/sources/air-quality');

describe('fetchAirQuality', () => {
  it('finds latest PM2.5 value and baseline, computes improvement', async () => {
    socrataQuery.mockResolvedValue([
      { name: 'Fine Particulate Matter (PM2.5)', geo_place_name: 'Manhattan', data_value: '9.8', start_date: '2024-01-01' },
      { name: 'Fine Particulate Matter (PM2.5)', geo_place_name: 'Manhattan', data_value: '8.4', start_date: '2025-04-01' },
    ]);

    const result = await fetchAirQuality();
    expect(result.before).toBe(9.8);
    expect(result.after).toBe(8.4);
    expect(result.improvementPct).toBeCloseTo(14.29, 1);
    expect(result.metric).toContain('PM2.5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/air-quality.test.js --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement the fetcher**

Create `scripts/sources/air-quality.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/air-quality.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sources/air-quality.js tests/air-quality.test.js
git commit -m "feat: add air quality fetcher (PM2.5 Manhattan) with tests"
```

---

## Task 9: News Fetcher

Fetches NYC congestion pricing news via RSS from major outlets. Returns the 10 most recent items. Uses no API key.

**Files:**
- Create: `scripts/sources/news.js`
- Create: `tests/news.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/news.test.js`:

```javascript
jest.mock('node-fetch');
const fetch = require('node-fetch');
const { parseNewsRss } = require('../scripts/sources/news');

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>NYC Congestion Pricing Shows Strong Results</title>
    <link>https://example.com/story1</link>
    <pubDate>Wed, 01 Jan 2025 12:00:00 GMT</pubDate>
    <source>The New York Times</source>
  </item>
  <item>
    <title>Congestion Pricing Revenue Tops Projections</title>
    <link>https://example.com/story2</link>
    <pubDate>Mon, 15 Jan 2025 09:00:00 GMT</pubDate>
    <source>Gothamist</source>
  </item>
</channel></rss>`;

describe('parseNewsRss', () => {
  it('extracts headline, url, date, and publication from items', () => {
    const items = parseNewsRss(MOCK_RSS);
    expect(items).toHaveLength(2);
    expect(items[0].headline).toBe('NYC Congestion Pricing Shows Strong Results');
    expect(items[0].url).toBe('https://example.com/story1');
    expect(items[0].date).toBe('2025-01-01');
    expect(items[1].headline).toBe('Congestion Pricing Revenue Tops Projections');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/news.test.js --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement the fetcher**

Create `scripts/sources/news.js`:

```javascript
const fetch = require('node-fetch');

// Google News RSS — no API key needed; returns recent articles matching query
const RSS_URL = 'https://news.google.com/rss/search?q=NYC+congestion+pricing+results&hl=en-US&gl=US&ceid=US:en';

function parseNewsRss(xml) {
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const tagRe = name => new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>|<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`);

  const items = [];
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const get = name => {
      const m = tagRe(name).exec(block);
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    const rawDate = get('pubDate');
    const parsed = rawDate ? new Date(rawDate) : null;
    const date = parsed && !isNaN(parsed) ? parsed.toISOString().slice(0, 10) : '';

    // Extract publication from <source> tag or from title suffix " - Publication"
    let publication = get('source');
    const title = get('title');
    if (!publication && title.includes(' - ')) {
      publication = title.split(' - ').pop().trim();
    }

    items.push({
      headline: title.replace(/ - [^-]+$/, '').trim(),
      url: get('link'),
      date,
      publication,
    });
  }

  return items.slice(0, 10);
}

async function fetchNews() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; dashboard-bot/1.0)' },
  });
  if (!res.ok) throw new Error(`News RSS error: ${res.status}`);
  const xml = await res.text();
  return parseNewsRss(xml);
}

module.exports = { fetchNews, parseNewsRss };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/news.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sources/news.js tests/news.test.js
git commit -m "feat: add news RSS fetcher with parsing tests"
```

---

## Task 10: Main Orchestrator + Write latest.json

Wires all source fetchers together, assembles the full `latest.json` payload, and writes it to `data/latest.json`.

**Files:**
- Create: `scripts/fetch-data.js`

- [ ] **Step 1: Write the orchestrator**

Create `scripts/fetch-data.js`:

```javascript
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
```

- [ ] **Step 2: Run all tests to make sure nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All tests PASS

- [ ] **Step 3: Do a dry-run of the fetch script (optional, requires internet)**

```bash
node scripts/fetch-data.js
```

Expected: `data/latest.json` written with real or partial data. Any failed sources print a WARN but don't crash.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-data.js
git commit -m "feat: add main orchestrator that writes data/latest.json"
```

---

## Task 11: GitHub Actions Workflow

Runs `fetch-data.js` every Monday at 9am ET, commits `data/latest.json` back to the repo.

**Files:**
- Create: `.github/workflows/update-data.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/update-data.yml`:

```yaml
name: Weekly Data Update

on:
  schedule:
    - cron: '0 14 * * 1'   # 14:00 UTC = 9:00am ET (EST); adjust to '0 13 * * 1' during EDT
  workflow_dispatch:         # Allow manual trigger from GitHub UI

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Fetch and write data
        run: node scripts/fetch-data.js
        env:
          SOCRATA_APP_TOKEN: ${{ secrets.SOCRATA_APP_TOKEN }}

      - name: Commit updated data
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/latest.json
          git diff --staged --quiet || git commit -m "chore: weekly data update $(date -u +'%Y-%m-%d')"
          git push
```

- [ ] **Step 2: Add SOCRATA_APP_TOKEN secret to GitHub**

In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
- Name: `SOCRATA_APP_TOKEN`
- Value: Get a free token at https://data.cityofnewyork.us/profile/app_tokens (increases rate limits; the script works without it but may hit throttling)

- [ ] **Step 3: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/update-data.yml
git commit -m "ci: add weekly GitHub Actions data update workflow"
```

---

## Task 12: index.html Skeleton + Base CSS

Creates the page shell with all section wrappers, loads Chart.js from CDN, and sets up the visual foundation.

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

- [ ] **Step 1: Create index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NYC Congestion Pricing: Results Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <header class="site-header">
    <div class="container">
      <h1>NYC Congestion Pricing: Results Dashboard</h1>
      <p class="subtitle">Tracking the measurable impact of New York City's Central Business District Tolling Program, launched January 9, 2025.</p>
      <p class="updated-at" id="updatedAt">Loading data…</p>
    </div>
  </header>

  <main class="container">

    <!-- Hero Stats -->
    <section id="hero-stats" class="hero-stats" aria-label="Key metrics at a glance"></section>

    <!-- Revenue -->
    <section id="revenue" class="dashboard-section">
      <h2>Revenue Generated</h2>
      <p class="section-meta" id="revenue-meta"></p>
      <div class="stat-highlight" id="revenue-total"></div>
      <div class="chart-wrap"><canvas id="revenueChart"></canvas></div>
    </section>

    <!-- Traffic -->
    <section id="traffic" class="dashboard-section">
      <h2>Vehicle Entry Reductions</h2>
      <p class="section-meta" id="traffic-meta"></p>
      <div class="stat-row">
        <div class="stat-card" id="traffic-total-avoided"></div>
        <div class="stat-card" id="traffic-reduction-pct"></div>
      </div>
      <div class="chart-wrap"><canvas id="trafficChart"></canvas></div>
    </section>

    <!-- Speed at Crossings -->
    <section id="speeds" class="dashboard-section">
      <h2>Speed Improvements at Key Crossings</h2>
      <p class="section-meta" id="speeds-meta"></p>
      <div class="chart-wrap"><canvas id="speedsChart"></canvas></div>
    </section>

    <!-- Time Savings -->
    <section id="time-savings" class="dashboard-section">
      <h2>Travel Time Savings</h2>
      <div class="stat-highlight" id="time-savings-stat"></div>
    </section>

    <!-- Ridership -->
    <section id="ridership" class="dashboard-section">
      <h2>MTA Ridership</h2>
      <p class="section-meta" id="ridership-meta"></p>
      <div class="stat-row">
        <div class="stat-card" id="ridership-total"></div>
        <div class="stat-card" id="ridership-vs-prior"></div>
      </div>
      <div class="chart-wrap"><canvas id="ridershipChart"></canvas></div>
    </section>

    <!-- Safety & Quality of Life -->
    <section id="safety" class="dashboard-section">
      <h2>Safety &amp; Quality of Life</h2>
      <p class="section-meta" id="safety-meta"></p>
      <div class="metric-grid" id="safety-grid"></div>
    </section>

    <!-- In the News -->
    <section id="news" class="dashboard-section">
      <h2>In the News</h2>
      <div class="news-grid" id="news-grid"></div>
    </section>

    <!-- Revenue Allocation (optional) -->
    <section id="revenue-allocation" class="dashboard-section hidden">
      <h2>How Revenue Is Being Spent</h2>
      <div id="allocation-content"></div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container">
      <p><strong>Data sources:</strong>
        <a href="https://data.ny.gov" target="_blank">data.ny.gov (MTA)</a> ·
        <a href="https://data.cityofnewyork.us" target="_blank">NYC Open Data</a> ·
        <a href="https://www.nyc.gov/html/dot/html/home/home.shtml" target="_blank">NYC DOT</a>
      </p>
      <p class="methodology">Methodology: Baseline traffic figures use Nov–Dec 2024 monthly averages. Speed comparisons use December 2024 as the pre-CP baseline. Ridership comparisons are year-over-year for the same calendar period. Accident and complaint counts compare the CP era (Jan 2025–present) to the same period in the prior year.</p>
      <p><a href="https://github.com" target="_blank">View source on GitHub</a></p>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="js/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/styles.css**

Create `css/styles.css`:

```css
:root {
  --navy:   #0a1628;
  --navy2:  #152240;
  --white:  #ffffff;
  --off-white: #f4f6fa;
  --orange: #f5a623;
  --green:  #27ae60;
  --red:    #e74c3c;
  --text:   #1a2a44;
  --muted:  #6b7a99;
  --border: #d0d9e8;
  --radius: 8px;
  --shadow: 0 2px 12px rgba(10,22,40,0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--off-white);
  color: var(--text);
  line-height: 1.6;
}

.container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

/* Header */
.site-header {
  background: var(--navy);
  color: var(--white);
  padding: 2.5rem 0 2rem;
  border-bottom: 4px solid var(--orange);
}
.site-header h1 { font-size: clamp(1.4rem, 3vw, 2.1rem); font-weight: 900; line-height: 1.2; }
.site-header .subtitle { margin-top: 0.5rem; color: #9aafcc; font-size: 0.95rem; max-width: 680px; }
.site-header .updated-at { margin-top: 0.75rem; font-size: 0.8rem; color: #6b88aa; }

/* Hero stats */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}
.hero-card {
  background: var(--navy);
  color: var(--white);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  border-top: 3px solid var(--orange);
}
.hero-card .big-num { font-size: 2rem; font-weight: 900; line-height: 1.1; color: var(--orange); }
.hero-card .label { font-size: 0.78rem; color: #9aafcc; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.04em; }

/* Sections */
.dashboard-section {
  background: var(--white);
  border-radius: var(--radius);
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}
.dashboard-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 0.25rem;
  border-left: 4px solid var(--orange);
  padding-left: 0.75rem;
}
.section-meta { font-size: 0.8rem; color: var(--muted); margin-bottom: 1.25rem; margin-left: 1rem; }

/* Stat highlight (large single number) */
.stat-highlight { text-align: center; padding: 1.5rem 0; }
.stat-highlight .big-num { font-size: 3.5rem; font-weight: 900; color: var(--navy); line-height: 1; }
.stat-highlight .label { font-size: 0.9rem; color: var(--muted); margin-top: 0.4rem; }
.stat-highlight .context { font-size: 0.85rem; color: var(--muted); margin-top: 0.5rem; max-width: 480px; margin-left: auto; margin-right: auto; }

/* Stat row */
.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: var(--off-white); border-radius: var(--radius); padding: 1rem 1.25rem; border: 1px solid var(--border); }
.stat-card .big-num { font-size: 2rem; font-weight: 900; color: var(--navy); }
.stat-card .label { font-size: 0.78rem; color: var(--muted); margin-top: 0.2rem; }

/* Chart wrapper */
.chart-wrap { position: relative; max-height: 320px; }

/* Metric grid (safety) */
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
.metric-card { background: var(--off-white); border-radius: var(--radius); padding: 1.25rem; border: 1px solid var(--border); }
.metric-card .metric-num { font-size: 1.75rem; font-weight: 900; }
.metric-card .metric-num.positive { color: var(--green); }
.metric-card .metric-num.neutral  { color: var(--navy); }
.metric-card .metric-label { font-size: 0.85rem; color: var(--text); font-weight: 600; margin-top: 0.3rem; }
.metric-card .metric-sub   { font-size: 0.75rem; color: var(--muted); margin-top: 0.2rem; }

/* News */
.news-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.news-card { background: var(--off-white); border-radius: var(--radius); padding: 1rem 1.25rem; border: 1px solid var(--border); }
.news-card a { font-weight: 600; color: var(--navy); text-decoration: none; font-size: 0.9rem; line-height: 1.4; }
.news-card a:hover { color: var(--orange); }
.news-card .news-meta { font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; }

/* Footer */
.site-footer {
  background: var(--navy2);
  color: #9aafcc;
  padding: 2rem 0;
  margin-top: 2rem;
  font-size: 0.8rem;
  line-height: 1.7;
}
.site-footer a { color: var(--orange); }
.site-footer .methodology { margin-top: 0.75rem; color: #6b88aa; max-width: 800px; }

/* Utility */
.hidden { display: none; }

/* Responsive */
@media (max-width: 600px) {
  .stat-highlight .big-num { font-size: 2.5rem; }
  .hero-card .big-num { font-size: 1.6rem; }
  .dashboard-section { padding: 1.25rem; }
}
```

- [ ] **Step 3: Verify the page opens in a browser (visual check)**

Open `index.html` in a browser. Expected: Navy header, orange accent bar, empty white section cards, no errors in console (other than failed fetch of `data/latest.json`).

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: add page skeleton with full section structure and styles"
```

---

## Task 13: dashboard.js — Data Loader + Hero Stats

Loads `data/latest.json` and populates the header timestamp and hero stat cards.

**Files:**
- Create: `js/dashboard.js`

- [ ] **Step 1: Create dashboard.js with data loader and hero renderer**

Create `js/dashboard.js`:

```javascript
(async function () {
  let data;
  try {
    const res = await fetch('data/latest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    document.getElementById('updatedAt').textContent = 'Data unavailable — check back soon.';
    console.error('Failed to load latest.json:', e);
    return;
  }

  // Header timestamp
  const d = new Date(data.updatedAt);
  document.getElementById('updatedAt').textContent =
    `Last updated: ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  renderHeroStats(data);
  renderRevenue(data.revenue);
  renderTraffic(data.traffic);
  renderSpeeds(data.speeds);
  renderTimeSavings(data.speeds);
  renderRidership(data.ridership);
  renderSafety(data.safety);
  renderNews(data.news);
  if (data.revenueAllocation) renderAllocation(data.revenueAllocation);

  function fmt(n, decimals = 0) {
    if (n == null) return '—';
    return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }

  function heroCard(bigNum, label) {
    return `<div class="hero-card"><div class="big-num">${bigNum}</div><div class="label">${label}</div></div>`;
  }

  function renderHeroStats(d) {
    const el = document.getElementById('hero-stats');
    const revenue = d.revenue?.totalMillions != null
      ? `$${fmt(d.revenue.totalMillions, 0)}M` : '—';
    const reductionPct = d.traffic?.reductionPct != null
      ? `${fmt(d.traffic.reductionPct, 1)}%` : '—';
    const minutesSaved = d.speeds?.avgMinutesSavedPerTrip != null
      ? `${fmt(d.speeds.avgMinutesSavedPerTrip, 1)} min` : '—';
    const ridershipDelta = (d.ridership?.totalSinceStartMillions != null && d.ridership?.priorYearSamePeriodMillions != null)
      ? `+${fmt(d.ridership.totalSinceStartMillions - d.ridership.priorYearSamePeriodMillions, 0)}M` : '—';
    const fatalities = d.safety?.pedestrianFatalities?.reductionPct != null
      ? `↓${fmt(d.safety.pedestrianFatalities.reductionPct, 0)}%` : '—';

    el.innerHTML =
      heroCard(revenue,       'Total Revenue Raised') +
      heroCard(reductionPct,  'Avg Vehicle Entry Reduction') +
      heroCard(minutesSaved,  'Avg Minutes Saved Per Trip') +
      heroCard(ridershipDelta,'Added Subway Riders vs Prior Year') +
      heroCard(fatalities,    'Pedestrian Fatality Reduction');
  }

  // --- Revenue ---
  function renderRevenue(rev) {
    if (!rev) return;
    document.getElementById('revenue-meta').textContent = `Data as of: ${rev.updatedAt}`;
    document.getElementById('revenue-total').innerHTML =
      `<div class="big-num">$${fmt(rev.totalMillions, 0)}M</div>
       <div class="label">Total Revenue Since January 2025</div>`;

    new Chart(document.getElementById('revenueChart'), {
      type: 'bar',
      data: {
        labels: rev.byMonth.map(r => r.month),
        datasets: [{
          label: 'Revenue ($M)',
          data: rev.byMonth.map(r => r.millions),
          backgroundColor: '#f5a623',
          borderRadius: 4,
        }],
      },
      options: chartOptions('Revenue ($M)'),
    });
  }

  // --- Traffic ---
  function renderTraffic(t) {
    if (!t) return;
    document.getElementById('traffic-meta').textContent = `Data as of: ${t.updatedAt} · Baseline: Nov–Dec 2024 avg (${fmt(t.baselineMonthlyAvg)} vehicles/month)`;
    document.getElementById('traffic-total-avoided').innerHTML =
      `<div class="big-num">${fmt(t.totalVehiclesAvoided)}</div>
       <div class="label">Total Vehicles Avoided Since Jan 2025</div>`;
    document.getElementById('traffic-reduction-pct').innerHTML =
      `<div class="big-num">${fmt(t.reductionPct, 1)}%</div>
       <div class="label">Latest Monthly Reduction vs Baseline</div>`;

    new Chart(document.getElementById('trafficChart'), {
      type: 'line',
      data: {
        labels: t.byMonth.map(r => r.month),
        datasets: [{
          label: 'Vehicle Reduction (%)',
          data: t.byMonth.map(r => r.reductionPct),
          borderColor: '#f5a623',
          backgroundColor: 'rgba(245,166,35,0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
        }],
      },
      options: chartOptions('% Reduction vs Baseline'),
    });
  }

  // --- Speeds ---
  function renderSpeeds(s) {
    if (!s) return;
    document.getElementById('speeds-meta').textContent =
      `Before: ${s.baseline} average · After: ${s.updatedAt} average`;

    new Chart(document.getElementById('speedsChart'), {
      type: 'bar',
      data: {
        labels: s.crossings.map(c => c.name),
        datasets: [
          {
            label: `Before (${s.baseline})`,
            data: s.crossings.map(c => c.beforeMph),
            backgroundColor: '#152240',
            borderRadius: 4,
          },
          {
            label: `After (${s.updatedAt})`,
            data: s.crossings.map(c => c.afterMph),
            backgroundColor: '#f5a623',
            borderRadius: 4,
          },
        ],
      },
      options: { ...chartOptions('Avg Speed (mph)'), plugins: { ...chartOptions('').plugins, legend: { display: true, position: 'top' } } },
    });
  }

  // --- Time Savings ---
  function renderTimeSavings(s) {
    if (!s) return;
    document.getElementById('time-savings-stat').innerHTML =
      `<div class="big-num">${fmt(s.avgMinutesSavedPerTrip, 1)}</div>
       <div class="label">Average Minutes Saved Per Trip</div>
       <div class="context">Derived from speed improvements at key Manhattan crossings (Brooklyn Bridge, Holland, Lincoln, Battery tunnels, Queensboro Bridge) relative to December 2024 baseline.</div>`;
  }

  // --- Ridership ---
  function renderRidership(r) {
    if (!r) return;
    document.getElementById('ridership-meta').textContent =
      `Data as of: ${r.updatedAt} · CP era vs same period prior year`;
    const delta = r.totalSinceStartMillions - r.priorYearSamePeriodMillions;
    document.getElementById('ridership-total').innerHTML =
      `<div class="big-num">${fmt(r.totalSinceStartMillions, 0)}M</div>
       <div class="label">Total Riders Since Jan 2025</div>`;
    document.getElementById('ridership-vs-prior').innerHTML =
      `<div class="big-num">+${fmt(delta, 0)}M</div>
       <div class="label">More Riders vs Same Period Prior Year</div>`;

    new Chart(document.getElementById('ridershipChart'), {
      type: 'line',
      data: {
        labels: r.byMonth.map(m => m.month),
        datasets: [
          {
            label: 'CP Era',
            data: r.byMonth.map(m => m.ridersMillions),
            borderColor: '#f5a623',
            backgroundColor: 'rgba(245,166,35,0.1)',
            tension: 0.3,
            fill: false,
            pointRadius: 4,
          },
          {
            label: 'Prior Year',
            data: r.byMonth.map(m => m.priorYearMillions),
            borderColor: '#9aafcc',
            borderDash: [5, 5],
            tension: 0.3,
            fill: false,
            pointRadius: 3,
          },
        ],
      },
      options: { ...chartOptions('Riders (Millions)'), plugins: { ...chartOptions('').plugins, legend: { display: true, position: 'top' } } },
    });
  }

  // --- Safety ---
  function renderSafety(s) {
    if (!s) return;
    document.getElementById('safety-meta').textContent =
      `Data as of: ${s.updatedAt} · CP era (Jan 2025–present) vs same period prior year`;

    const grid = document.getElementById('safety-grid');
    grid.innerHTML = [
      {
        num: s.accidents.reductionPct != null ? `↓${fmt(s.accidents.reductionPct, 1)}%` : '—',
        label: 'Crash Reduction',
        sub: `${fmt(s.accidents.currentYearCount)} crashes (vs ${fmt(s.accidents.priorYearCount)} prior year)`,
      },
      {
        num: s.pedestrianFatalities.reductionPct != null ? `↓${fmt(s.pedestrianFatalities.reductionPct, 1)}%` : '—',
        label: 'Pedestrian Fatality Reduction',
        sub: `${s.pedestrianFatalities.currentYearCount} fatalities (vs ${s.pedestrianFatalities.priorYearCount} prior year)`,
      },
      {
        num: s.noiseComplaints.reductionPct != null ? `↓${fmt(s.noiseComplaints.reductionPct, 1)}%` : '—',
        label: 'Noise & Honking Complaints (311)',
        sub: `${fmt(s.noiseComplaints.currentCount)} complaints (vs ${fmt(s.noiseComplaints.priorYearCount)} prior year)`,
      },
      {
        num: s.airQuality?.improvementPct != null ? `↓${fmt(s.airQuality.improvementPct, 1)}%` : '—',
        label: 'PM2.5 Air Quality Improvement',
        sub: s.airQuality ? `${s.airQuality.before} → ${s.airQuality.after} µg/m³ (Manhattan core) · as of ${s.airQuality.updatedAt}` : 'Data pending',
      },
    ].map(c => `
      <div class="metric-card">
        <div class="metric-num positive">${c.num}</div>
        <div class="metric-label">${c.label}</div>
        <div class="metric-sub">${c.sub}</div>
      </div>`).join('');
  }

  // --- News ---
  function renderNews(articles) {
    if (!articles?.length) return;
    const grid = document.getElementById('news-grid');
    grid.innerHTML = articles.map(a => `
      <div class="news-card">
        <a href="${a.url}" target="_blank" rel="noopener">${a.headline}</a>
        <div class="news-meta">${a.publication} · ${a.date}</div>
      </div>`).join('');
  }

  // --- Revenue Allocation ---
  function renderAllocation(alloc) {
    document.getElementById('revenue-allocation').classList.remove('hidden');
    document.getElementById('allocation-content').innerHTML =
      `<p style="color:var(--muted);font-size:.9rem">${JSON.stringify(alloc)}</p>`;
    // Expand this section when real allocation data structure is known
  }

  // --- Chart defaults ---
  function chartOptions(yLabel) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6b7a99', font: { size: 11 } } },
        y: {
          grid: { color: '#e8edf5' },
          ticks: { color: '#6b7a99', font: { size: 11 } },
          title: { display: !!yLabel, text: yLabel, color: '#6b7a99', font: { size: 11 } },
        },
      },
    };
  }

})();
```

- [ ] **Step 2: Test with a seed latest.json**

Create `data/latest.json` with sample data to verify the page renders correctly:

```json
{
  "updatedAt": "2026-04-02T10:00:00Z",
  "revenue": {
    "updatedAt": "2025-03",
    "totalMillions": 142.1,
    "byMonth": [
      { "month": "2025-01", "millions": 45.2 },
      { "month": "2025-02", "millions": 47.8 },
      { "month": "2025-03", "millions": 49.1 }
    ]
  },
  "traffic": {
    "updatedAt": "2025-03",
    "baselineMonthlyAvg": 867500,
    "reductionPct": 14.2,
    "totalVehiclesAvoided": 358000,
    "byMonth": [
      { "month": "2025-01", "count": 762000, "reductionPct": 12.1 },
      { "month": "2025-02", "count": 748000, "reductionPct": 13.8 },
      { "month": "2025-03", "count": 743000, "reductionPct": 14.4 }
    ]
  },
  "speeds": {
    "updatedAt": "2025-03",
    "baseline": "2024-12",
    "avgMinutesSavedPerTrip": 7.8,
    "crossings": [
      { "name": "Brooklyn Bridge",   "beforeMph": 8.2,  "afterMph": 12.4 },
      { "name": "Holland Tunnel",    "beforeMph": 10.1, "afterMph": 14.8 },
      { "name": "Lincoln Tunnel",    "beforeMph": 9.4,  "afterMph": 13.2 },
      { "name": "Battery Tunnel",    "beforeMph": 11.2, "afterMph": 15.6 },
      { "name": "Queensboro Bridge", "beforeMph": 9.8,  "afterMph": 13.9 }
    ]
  },
  "ridership": {
    "updatedAt": "2025-03",
    "totalSinceStartMillions": 562.5,
    "priorYearSamePeriodMillions": 538.2,
    "byMonth": [
      { "month": "2025-01", "ridersMillions": 182.4, "priorYearMillions": 178.1 },
      { "month": "2025-02", "ridersMillions": 188.2, "priorYearMillions": 180.6 },
      { "month": "2025-03", "ridersMillions": 191.9, "priorYearMillions": 179.5 }
    ]
  },
  "safety": {
    "updatedAt": "2025-03-31",
    "accidents": { "currentYearCount": 4200, "priorYearCount": 4950, "reductionPct": 15.2 },
    "pedestrianFatalities": { "currentYearCount": 12, "priorYearCount": 19, "reductionPct": 36.8 },
    "noiseComplaints": { "currentCount": 3800, "priorYearCount": 4900, "reductionPct": 22.4 },
    "airQuality": { "updatedAt": "2025-10-01", "metric": "PM2.5 (µg/m³) — Manhattan", "before": 9.8, "after": 8.4, "improvementPct": 14.3 }
  },
  "news": [
    { "headline": "Congestion Pricing Delivers: Traffic Down, Revenue Up", "publication": "The New York Times", "date": "2025-03-15", "url": "https://nytimes.com" },
    { "headline": "MTA Reports Ridership Surge Since Congestion Toll Launch", "publication": "Gothamist", "date": "2025-03-10", "url": "https://gothamist.com" }
  ],
  "revenueAllocation": null
}
```

Open `index.html` in a browser. Expected: All sections populated with charts, hero stats showing real numbers, no console errors.

- [ ] **Step 3: Serve locally to avoid CORS (fetch requires a server)**

```bash
npx serve . -p 3000
```

Then open `http://localhost:3000` in a browser.

- [ ] **Step 4: Commit**

```bash
git add js/dashboard.js data/latest.json
git commit -m "feat: add dashboard.js with all section renderers and seed data"
```

---

## Task 14: Run All Tests + Final Cleanup

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS. Fix any failures before continuing.

- [ ] **Step 2: Verify .gitignore excludes node_modules**

```bash
git status
```

Expected: `node_modules/` does not appear as an untracked file.

- [ ] **Step 3: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/congestion-pricing-dashboard.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. The GitHub Actions workflow will trigger automatically next Monday, or you can trigger it manually from the Actions tab.

- [ ] **Step 4: Verify workflow runs (optional manual trigger)**

In GitHub: Actions tab → "Weekly Data Update" → "Run workflow" → confirm it completes without errors.

- [ ] **Step 5: Final commit with any lingering cleanup**

```bash
git status
git add -A
git commit -m "chore: final cleanup and project complete"
git push
```

---

## Post-Launch Notes

1. **Dataset ID verification** — Before the first real data run, manually verify the three dataset IDs flagged in the plan (traffic `t6u2-gbxz`, revenue `9jsb-u6ij`, speed link IDs in `speeds.js`). Search at https://data.ny.gov and https://data.cityofnewyork.us if any are wrong.

2. **Speed link IDs** — Complete the one-time lookup in Task 5 Step 1 to find the exact `link_id` values for each crossing and update `CROSSING_LINKS` in `scripts/sources/speeds.js`.

3. **Revenue fallback** — If the revenue API dataset doesn't exist, `data/revenue-override.json` can be manually populated from MTA's monthly press releases.

4. **Hosting** — To deploy: push to GitHub and enable GitHub Pages (Settings → Pages → Deploy from branch: `main`, folder: `/root`). The page will be live at `https://YOUR_USERNAME.github.io/congestion-pricing-dashboard/`.
