/*
  overview.js — versão com dados reais do ML
  Substitui js/overview.js no GitHub
*/

let salesChartInstance = null;

function renderOverviewKpis(data) {
  const { kpis } = data;
  document.getElementById('kpiSales').textContent = formatNumber(kpis.sales);
  document.getElementById('kpiRevenue').textContent = formatCurrency(kpis.revenue);
  document.getElementById('kpiVisits').textContent = formatNumber(kpis.visits);
  document.getElementById('kpiConversion').textContent = kpis.conversion.toFixed(1) + '%';
  setTrend('kpiSalesTrend', kpis.salesTrend);
  setTrend('kpiRevenueTrend', kpis.revenueTrend);
  setTrend('kpiVisitsTrend', kpis.visitsTrend);
  setTrend('kpiConversionTrend', kpis.conversionTrend);
}

function setTrend(elementId, value) {
  const el = document.getElementById(elementId);
  el.textContent = formatTrend(value) + ' vs período anterior';
  el.className = 'kpi-card__trend ' + trendClass(value);
}

function renderSalesChart(salesByDay) {
  const ctx = document.getElementById('salesChart');
  const labels = salesByDay.map((_, i) => `D${i + 1}`);
  if (salesChartInstance) salesChartInstance.destroy();
  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Vendas',
        data: salesByDay,
        borderColor: '#ffb454',
        backgroundColor: 'rgba(255, 180, 84, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5d7186' } },
        y: { grid: { color: '#213548' }, ticks: { color: '#5d7186' } },
      },
    },
  });
}

function renderProductPerfList(data, tab) {
  const list = document.getElementById('productPerfList');
  const items = tab === 'up' ? data.productsUp : data.productsDown;
  list.innerHTML = '';

  if (!items || items.length === 0) {
    list.innerHTML = `<li><span class="product-list__name">Nenhum produto nesta categoria</span></li>`;
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    const trendClassName = String(item.trend).startsWith('+') ? 'tag--ok' : 'tag--danger';
    li.innerHTML = `
      <span class="product-list__name">${item.name}</span>
      <span class="product-list__meta">
        ${item.sales} vendas
        <span class="tag ${trendClassName}">${item.trend}</span>
      </span>
    `;
    list.appendChild(li);
  });
}

function initProductPerfTabs(data) {
  const tabs = document.querySelectorAll('#productPerfTabs .tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderProductPerfList(data, tab.dataset.tab);
    });
  });
}

function renderCompetitorTable(accountId) {
  const tbody = document.querySelector('#competitorTable tbody');
  tbody.innerHTML = '';
  const accountData = MOCK_COMPETITOR_DATA[accountId];

  if (!accountData || accountData.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum produto monitorado para esta conta ainda.</td></tr>`;
    return;
  }

  accountData.products.forEach((product) => {
    const cheapest = product.competitors.reduce((min, c) => (c.price < min.price ? c : min), product.competitors[0]);
    const diff = product.yourPrice - cheapest.price;
    const diffPct = (diff / product.yourPrice) * 100;

    let statusTag;
    if (diff > 0) statusTag = `<span class="tag tag--danger">Você está mais caro</span>`;
    else if (diff < 0) statusTag = `<span class="tag tag--ok">Você está mais barato</span>`;
    else statusTag = `<span class="tag tag--warn">Preço igual</span>`;

    const stockText = cheapest.stock > 0 ? `${cheapest.stock} un.` : 'Sem estoque';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${formatCurrency(product.yourPrice)}</td>
      <td>${formatCurrency(cheapest.price)} <span style="color:var(--color-text-faint)">(${cheapest.seller})</span></td>
      <td style="color:${diff > 0 ? 'var(--color-negative)' : diff < 0 ? 'var(--color-positive)' : 'inherit'}">${formatTrend(-diffPct)}</td>
      <td>${cheapest.stock === 0 ? `<span class="tag tag--danger">${stockText}</span>` : stockText}</td>
      <td>${statusTag}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showOverviewNotConnected(accountId) {
  // Busca o nome da loja para mostrar mensagem amigável
  const accounts = window._mlAccounts || [];
  const account = accounts.find(a => a.id === accountId);
  const name = account?.nickname || accountId;

  document.getElementById('kpiSales').textContent = '—';
  document.getElementById('kpiRevenue').textContent = '—';
  document.getElementById('kpiVisits').textContent = '—';
  document.getElementById('kpiConversion').textContent = '—';
  ['kpiSalesTrend','kpiRevenueTrend','kpiVisitsTrend','kpiConversionTrend'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });

  const tbody = document.querySelector('#competitorTable tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px;">
    ⚠️ A loja <strong>${name}</strong> ainda não está conectada ao Mercado Livre.<br>
    <span style="font-size:0.85rem; color:var(--color-text-muted)">Clique em "🔗 Conectar ML" no topo para autorizar.</span>
  </td></tr>`;
}

async function loadOverview() {
  const accountId = getCurrentAccountId();

  // Tenta buscar dados reais da API
  try {
    const response = await fetch(`/api/overview?account_id=${accountId}`);
    const data = await response.json();

    if (!response.ok) {
      if (data.not_connected) {
        showOverviewNotConnected(accountId);
        return;
      }
      // Se falhou mas temos mock, usa mock
      loadOverviewMock(accountId);
      return;
    }

    renderOverviewKpis(data);
    renderSalesChart(data.salesByDay);
    initProductPerfTabs(data);
    renderProductPerfList(data, 'up');
    document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));
    renderCompetitorTable(accountId);

  } catch (err) {
    console.warn('API overview falhou, usando mock:', err);
    loadOverviewMock(accountId);
  }
}

function loadOverviewMock(accountId) {
  const data = MOCK_OVERVIEW[accountId];
  if (!data) return;
  renderOverviewKpis(data);
  renderSalesChart(data.salesByDay);
  initProductPerfTabs(data);
  renderProductPerfList(data, 'up');
  document.querySelectorAll('#productPerfTabs .tab').forEach((t, i) => t.classList.toggle('is-active', i === 0));
  renderCompetitorTable(accountId);
}

function initOverview() {
  loadOverview();

  document.getElementById('refreshOverview').addEventListener('click', loadOverview);
  document.addEventListener('accountChanged', loadOverview);
}
