/*
  js/overview.js — SEM a tabela "seu preço vs concorrência"
  ---------------------------------------------------------
  A Visão geral agora foca em: KPIs reais, gráfico de vendas e
  produtos em alta/baixa. A tabela de concorrentes foi REMOVIDA
  daqui (ela continua existindo na aba "Concorrentes").

  Nada mais foi alterado — KPIs, gráfico e abas seguem iguais.
*/

let salesChartInstance = null;

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

function showOverviewNotConnected(accountId) {
  ['kpiSales','kpiRevenue','kpiVisits','kpiConversion'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  ['kpiSalesTrend','kpiRevenueTrend','kpiVisitsTrend','kpiConversionTrend'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
}

async function loadOverview() {
  const accountId = getCurrentAccountId();

  try {
    const res  = await fetch(`/api/overview?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok) {
      if (data.not_connected) { showOverviewNotConnected(accountId); return; }
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    renderOverviewKpis(data);
    renderSalesChart(data.salesByDay);
    initProductPerfTabs(data);
    renderProductPerfList(data, 'up');
    document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));

  } catch (err) {
    console.warn('[overview] API falhou:', err.message);
    // Fallback para mock se existir
    if (typeof MOCK_OVERVIEW !== 'undefined' && MOCK_OVERVIEW[accountId]) {
      const data = MOCK_OVERVIEW[accountId];
      renderOverviewKpis(data);
      renderSalesChart(data.salesByDay);
      initProductPerfTabs(data);
      renderProductPerfList(data, 'up');
      document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));
    }
  }
}

function initOverview() {
  loadOverview();
  document.getElementById('refreshOverview').addEventListener('click', loadOverview);
  document.addEventListener('accountChanged', loadOverview);
}
