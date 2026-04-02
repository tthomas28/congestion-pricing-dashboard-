# NYC Congestion Pricing Results Dashboard — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Audience:** Policymakers and advocates
**Tone:** Authoritative, data-forward, neutral

---

## Overview

A single-page public dashboard showcasing the measurable progress of NYC's congestion pricing program. Data is pre-fetched weekly via GitHub Actions and stored as a static JSON file. The page reads that file and renders all charts and metrics — no live API calls from the browser.

---

## Architecture

```
/
├── index.html                  # The page
├── data/
│   └── latest.json             # Pre-fetched, aggregated data (committed weekly)
├── scripts/
│   └── fetch-data.js           # Node.js script: pulls all APIs, writes latest.json
└── .github/
    └── workflows/
        └── update-data.yml     # GitHub Actions cron — runs every Monday morning
```

**End-to-end flow:**
1. Every Monday, GitHub Actions runs `fetch-data.js`
2. Script calls all data sources, computes derived metrics, writes `data/latest.json`
3. Script commits and pushes the updated JSON to the repo
4. `index.html` reads `latest.json` and renders all sections — no browser API calls

---

## Page Layout

Single scrolling page, top to bottom:

### 1. Header
- Title: "NYC Congestion Pricing: Results Dashboard"
- Last-updated timestamp (pulled from `latest.json`)
- One-line description of what congestion pricing is

### 2. Hero Stats Bar
4–5 large stat cards showing the most impactful single numbers:
- Total revenue raised
- Total vehicle entry reduction (%)
- Average minutes saved per trip
- MTA ridership increase
- Pedestrian fatalities reduced

### 3. Revenue
- Total revenue raised (large prominent number)
- Bar or line chart: revenue by month

### 4. Traffic
- Total vehicle entry reductions (number)
- Trend line: % vehicle reduction over time

### 5. Speed at Key Crossings
- Grouped bar chart showing before/after average speeds at:
  - Brooklyn Bridge
  - Holland Tunnel
  - Lincoln Tunnel
  - Battery Tunnel
  - Queensboro Bridge
- "Before" baseline = pre-congestion pricing (December 2024 or earlier); "After" = most recent available month

### 6. Time Savings
- Single bold metric: average minutes saved per trip across the region
- Supporting context sentence

### 7. MTA Ridership
- Total ridership figures since congestion pricing began (January 2025), with comparison to same period prior year
- Trend line over time; note that increases reflect the CP era, not strict causal attribution

### 8. Safety & Quality of Life
- Grid of metric cards:
  - Vehicle accidents/injuries down
  - Pedestrian fatalities down
  - 311 noise/honking complaints down
  - Air quality improvement index

### 9. In the News
- Card list of positive press coverage
- Each card: headline, publication name, date, link

### 10. Revenue Allocation (optional)
- Simple breakdown of what CP funds are being spent on
- Shown only if data is available; hidden otherwise

### 11. Footer
- Data sources cited with links
- Methodology note
- GitHub repo link for transparency

---

## Data Sources & Update Cadence

| Section | Source | Real Cadence |
|---|---|---|
| Revenue | MTA TBTA / MTA Open Data Portal | Monthly |
| Traffic volume | MTA Congestion Pricing Open Data (data.ny.gov) | Monthly |
| Crossing speeds | NYC DOT Speed Data / HERE Traffic API | Monthly |
| Time savings | Derived from DOT speed data | Monthly |
| MTA Ridership | MTA Open Data (turnstile/ridership data) | Weekly |
| Accidents & injuries | NYC Open Data — Vision Zero (NYPD crash data) | Monthly |
| Pedestrian fatalities | Vision Zero (same dataset) | Monthly |
| 311 noise/honking | NYC Open Data — 311 Service Requests | Weekly |
| Air quality | NYC Open Data — DOHMH Air Quality | Quarterly |
| In the News | Google News RSS or manual curation | Weekly |
| Revenue allocation | MTA capital program reports | Quarterly/ad hoc |

**Notes:**
- GitHub Action runs weekly; most sources publish monthly — the script picks up whatever is newest
- Each section displays a "data as of [date]" label for transparency
- Air quality and revenue allocation update infrequently and may appear static between updates
- News section benefits most from weekly attention; RSS automation possible but may need manual filtering

---

## Tech Stack

- **Frontend:** Plain HTML + CSS + vanilla JavaScript (no framework, no build step)
- **Charts:** Chart.js (bar, line, grouped bar)
- **Layout:** CSS Grid / Flexbox (no CSS framework)
- **Automation:** GitHub Actions + Node.js fetch script
- **Hosting:** TBD — compatible with GitHub Pages, Netlify, Vercel, or any static host

---

## Visual Style

- **Color palette:** Deep navy, clean white, orange/yellow accent (civic/MTA-adjacent)
- **Typography:** System fonts or Inter — clean sans-serif, nothing decorative
- **Stat cards:** Large bold number, small label underneath — scannable at a glance
- **Charts:** Minimal — gridlines, clear axis labels, no 3D effects or decoration
- **Responsive:** Mobile-friendly — policymakers read on phones
- **No:** animations beyond subtle fade-in, user accounts, filters, third-party tracking

---

## Out of Scope

- User authentication or personalization
- Interactive filters or date range selectors
- Any backend server (fully static)
- Branding or organizational affiliation
