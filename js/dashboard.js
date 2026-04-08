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
      ? (() => { const d2 = d.ridership.totalSinceStartMillions - d.ridership.priorYearSamePeriodMillions; return `${d2 >= 0 ? '+' : ''}${fmt(d2, 0)}M`; })() : '—';
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
    document.getElementById('traffic-meta').textContent =
      `Data as of: ${t.updatedAt} · ${t.reductionNote || ''}`;
    document.getElementById('traffic-total-avoided').innerHTML =
      `<div class="big-num">${fmt(t.totalEntriesAvoidedYoy)}</div>
       <div class="label">Vehicle Entries Avoided vs. Prior Year (${t.yoyPeriod})</div>`;
    document.getElementById('traffic-reduction-pct').innerHTML =
      `<div class="big-num">↓${fmt(t.reductionPct, 1)}%</div>
       <div class="label">Avg Vehicle Entry Reduction (MTA reported)</div>`;

    new Chart(document.getElementById('trafficChart'), {
      type: 'bar',
      data: {
        labels: t.byMonth.map(r => r.month),
        datasets: [{
          label: 'Monthly CRZ Entries',
          data: t.byMonth.map(r => r.count),
          backgroundColor: '#f5a623',
          borderRadius: 4,
        }],
      },
      options: chartOptions('Vehicles'),
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
      `<div class="big-num">${delta >= 0 ? '+' : ''}${fmt(delta, 0)}M</div>
       <div class="label">${delta >= 0 ? 'More' : 'Fewer'} Riders vs Same Period Prior Year</div>`;

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
    grid.innerHTML = '';
    articles.forEach(a => {
      const card = document.createElement('div');
      card.className = 'news-card';

      const link = document.createElement('a');
      // Only allow https:// URLs to prevent javascript: injection
      link.href = a.url && a.url.startsWith('https://') ? a.url : '#';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = a.headline;

      const meta = document.createElement('div');
      meta.className = 'news-meta';
      meta.textContent = `${a.publication} · ${a.date}`;

      card.appendChild(link);
      card.appendChild(meta);
      grid.appendChild(card);
    });
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
