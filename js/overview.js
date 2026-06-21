/*
  js/overview.js
  Visão geral: KPIs reais, gráfico, produtos em destaque,
  última venda e análise geral do negócio (IA).
*/

let salesChartInstance = null;
let _lastOverviewData  = null; // cache para passar à análise IA

function renderOverviewKpis(data) {
  const { kpis } = data;
  document.getElementById('kpiSales').textContent      = formatNumber(kpis.sales);
  document.getElementById('kpiRevenue').textContent    = formatCurrency(kpis.revenue);
  document.getElementById('kpiVisits').textContent     = formatNumber(kpis.visits);
  document.getElementById('kpiConversion').textContent = kpis.conversion.toFixed(1) + '%';
  setTrend('kpiSalesTrend',      kpis.salesTrend);
  setTrend('kpiRevenueTrend',    kpis.revenueTrend);
  setTrend('kpiVisitsTrend',     kpis.visitsTrend);
  setTrend('kpiConversionTrend', kpis.conversionTrend);
}

function setTrend(elementId, value) {
  const el = document.getElementById(elementId);
  if (!value || value === 0) {
    el.textContent = '— vs período anterior';
    el.className   = 'kpi-card__trend';
    return;
  }
  el.textContent = formatTrend(value) + ' vs período anterior';
  el.className   = 'kpi-card__trend ' + trendClass(value);
}

function renderSalesChart(salesByDay) {
  const ctx    = document.getElementById('salesChart');
  const labels = salesByDay.map((_, i) => `D${i + 1}`);
  if (salesChartInstance) salesChartInstance.destroy();
  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           'Vendas',
        data:            salesByDay,
        borderColor:     '#ffb454',
        backgroundColor: 'rgba(255, 180, 84, 0.12)',
        fill:            true,
        tension:         0.35,
        pointRadius:     salesByDay.some(v => v > 0) ? 3 : 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5d7186' } },
        y: { grid: { color: '#213548' }, ticks: { color: '#5d7186', stepSize: 1 }, beginAtZero: true },
      },
    },
  });
}

function renderProductPerfList(data, tab) {
  const list  = document.getElementById('productPerfList');
  const items = tab === 'up' ? data.productsUp : data.productsDown;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    list.innerHTML = `<li><span class="product-list__name">Nenhum produto nesta categoria</span></li>`;
    return;
  }
  items.forEach(item => {
    const li      = document.createElement('li');
    const trendCls = String(item.trend).startsWith('+') ? 'tag--ok' : 'tag--danger';
    li.innerHTML = `
      <span class="product-list__name">${item.name}</span>
      <span class="product-list__meta">
        ${formatNumber(item.sales)} vendas
        <span class="tag ${trendCls}">${item.trend === '+' ? '↑ alta' : item.trend === '-' ? '↓ baixa' : item.trend}</span>
      </span>`;
    list.appendChild(li);
  });
}

function initProductPerfTabs(data) {
  const tabs = document.querySelectorAll('#productPerfTabs .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderProductPerfList(data, tab.dataset.tab);
    });
  });
}

function renderLastSale(lastSale) {
  const body = document.getElementById('lastSaleBody');
  const time = document.getElementById('lastSaleTime');
  if (!lastSale) {
    body.innerHTML   = `<span class="form-hint">Nenhuma venda encontrada nos últimos 30 dias.</span>`;
    time.textContent = '—';
    return;
  }
  const date = new Date(lastSale.at);
  const pad  = n => String(n).padStart(2, '0');
  time.textContent = `${pad(date.getDate())}/${pad(date.getMonth()+1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <span style="font-family:var(--font-mono);font-size:1.4rem;font-weight:700;color:var(--color-positive);">
        ${formatCurrency(lastSale.amount)}
      </span>
      ${lastSale.product
        ? `<span style="font-size:0.875rem;color:var(--color-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px;">${lastSale.product}</span>`
        : ''}
    </div>
  `;
}

// ── Análise geral do negócio (IA) ─────────────────────────────

function resetBusinessAnalysis() {
  const body = document.getElementById('businessAnalysisBody');
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <p class="form-hint" style="margin:0;">Clique para gerar o diagnóstico da sua conta com IA.</p>
      <button class="btn btn--primary" id="runBusinessAnalysis">Analisar negócio</button>
    </div>
  `;
  document.getElementById('runBusinessAnalysis').addEventListener('click', runBusinessAnalysis);
}

async function runBusinessAnalysis() {
  if (!_lastOverviewData) return;

  const body = document.getElementById('businessAnalysisBody');
  const hint = document.getElementById('businessAnalysisHint');

  body.innerHTML = `
    <div class="loading-row">
      <span class="spinner"></span>
      <span>Analisando os dados da sua conta com IA… pode levar alguns segundos.</span>
    </div>
  `;
  hint.textContent = 'aguarde…';

  try {
    const res = await fetch('/api/business-analysis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        account_id:   getCurrentAccountId(),
        kpis:         _lastOverviewData.kpis,
        productsUp:   _lastOverviewData.productsUp,
        productsDown: _lastOverviewData.productsDown,
        lastSale:     _lastOverviewData.lastSale,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    renderBusinessAnalysis(data);
    hint.textContent = 'atualizado agora';

  } catch (err) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <p class="form-hint" style="color:var(--color-danger);margin:0;">Erro ao gerar análise: ${err.message}</p>
        <button class="btn btn--ghost" id="runBusinessAnalysis">Tentar novamente</button>
      </div>
    `;
    document.getElementById('runBusinessAnalysis').addEventListener('click', runBusinessAnalysis);
    hint.textContent = 'diagnóstico gerado por IA';
  }
}

function renderBusinessAnalysis(data) {
  const healthColors = {
    'Ótimo':   'var(--color-positive)',
    'Bom':     '#5fb3d9',
    'Regular': 'var(--color-accent)',
    'Crítico': 'var(--color-danger)',
  };
  const healthColor = healthColors[data.health_label] || 'var(--color-text-muted)';

  const actPriorityTag = p => {
    if (p === 'alta')  return `<span class="tag tag--danger" style="font-size:0.65rem;">URGENTE</span>`;
    if (p === 'media') return `<span class="tag tag--warn"   style="font-size:0.65rem;">MÉDIO</span>`;
    return                     `<span class="tag"            style="font-size:0.65rem;">BAIXO</span>`;
  };

  const strengths = (data.strengths || []).map(s =>
    `<li style="display:flex;gap:8px;align-items:flex-start;"><span style="color:var(--color-positive);flex-shrink:0;">✓</span><span>${s}</span></li>`
  ).join('');

  const warnings = (data.warnings || []).map(w =>
    `<li style="display:flex;gap:8px;align-items:flex-start;"><span style="color:var(--color-accent);flex-shrink:0;">⚠</span><span>${w}</span></li>`
  ).join('');

  const actions = (data.actions || []).map(a => `
    <li style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--color-border);">
      ${actPriorityTag(a.priority)}
      <span style="font-size:0.875rem;">${a.action}</span>
    </li>
  `).join('');

  document.getElementById('businessAnalysisBody').innerHTML = `
    <!-- Saúde geral -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:80px;">
        <span style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:${healthColor};">${data.health_score ?? '—'}</span>
        <span style="font-size:0.75rem;font-weight:600;color:${healthColor};">${data.health_label || ''}</span>
      </div>
      <p style="font-size:0.9rem;line-height:1.6;color:var(--color-text-muted);flex:1;margin:0;">${data.summary || ''}</p>
    </div>

    <div class="grid-2" style="gap:16px;margin-bottom:20px;">
      <!-- Pontos fortes -->
      <div>
        <p style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin:0 0 10px;">Pontos fortes</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          ${strengths || '<li style="color:var(--color-text-muted);">Nenhum identificado.</li>'}
        </ul>
      </div>
      <!-- Alertas -->
      <div>
        <p style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin:0 0 10px;">Atenção</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          ${warnings || '<li style="color:var(--color-text-muted);">Nenhum alerta no momento.</li>'}
        </ul>
      </div>
    </div>

    <!-- Ações prioritárias -->
    <div>
      <p style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin:0 0 8px;">Ações recomendadas</p>
      <ul style="list-style:none;padding:0;margin:0;">
        ${actions || '<li style="font-size:0.875rem;color:var(--color-text-muted);">Nenhuma ação identificada.</li>'}
      </ul>
    </div>

    <!-- Botão reanalisar -->
    <div style="margin-top:16px;">
      <button class="btn btn--ghost" id="runBusinessAnalysis" style="font-size:0.8rem;">↻ Reanalisar</button>
    </div>
  `;

  document.getElementById('runBusinessAnalysis').addEventListener('click', runBusinessAnalysis);
}

// ── Estado: conta não conectada ────────────────────────────────

function showOverviewNotConnected() {
  ['kpiSales','kpiRevenue','kpiVisits','kpiConversion'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  ['kpiSalesTrend','kpiRevenueTrend','kpiVisitsTrend','kpiConversionTrend'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('lastSaleBody').innerHTML    = `<span class="form-hint">Conta não conectada.</span>`;
  document.getElementById('lastSaleTime').textContent  = '—';
  resetBusinessAnalysis();
  _lastOverviewData = null;
}

// ── Carregamento principal ─────────────────────────────────────

async function loadOverview() {
  const accountId = getCurrentAccountId();

  try {
    const res  = await fetch(`/api/overview?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok) {
      if (data.not_connected) { showOverviewNotConnected(); return; }
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    _lastOverviewData = data;
    renderOverviewKpis(data);
    renderSalesChart(data.salesByDay);
    initProductPerfTabs(data);
    renderProductPerfList(data, 'up');
    renderLastSale(data.lastSale || null);
    resetBusinessAnalysis();
    document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));

  } catch (err) {
    console.warn('[overview] API falhou:', err.message);
    if (typeof MOCK_OVERVIEW !== 'undefined' && MOCK_OVERVIEW[accountId]) {
      const data = MOCK_OVERVIEW[accountId];
      _lastOverviewData = data;
      renderOverviewKpis(data);
      renderSalesChart(data.salesByDay);
      initProductPerfTabs(data);
      renderProductPerfList(data, 'up');
      renderLastSale(data.lastSale || null);
      resetBusinessAnalysis();
      document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));
    }
  }
}

function initOverview() {
  loadOverview();
  document.getElementById('refreshOverview').addEventListener('click', () => {
    _lastOverviewData = null;
    resetBusinessAnalysis();
    loadOverview();
  });
  document.addEventListener('accountChanged', () => {
    _lastOverviewData = null;
    resetBusinessAnalysis();
    loadOverview();
  });
}
