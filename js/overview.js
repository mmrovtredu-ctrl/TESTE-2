/*
  js/overview.js — versão REAL (sem MOCK_COMPETITOR_DATA)
  Tabela de concorrentes usa a API pública do ML.
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

// ── Tabela de concorrentes com dados REAIS do ML ──────────────────────────────
async function renderCompetitorTable(accountId, overviewData) {
  const tbody = document.querySelector('#competitorTable tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;">
    <div class="loading-row" style="justify-content:center;"><span class="spinner"></span><span>Buscando concorrentes…</span></div>
  </td></tr>`;

  try {
    // Usa os produtos em alta para comparar com concorrentes
    const products = overviewData?.productsUp || [];
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--color-text-muted);">Nenhum produto encontrado.</td></tr>`;
      return;
    }

    // Busca o concorrente mais barato para cada produto via API pública do ML
    const rows = await Promise.all(
      products.slice(0, 5).map(async product => {
        try {
          const res = await fetch(
            `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(product.name)}&limit=5&sort=price_asc`
          );
          if (!res.ok) return null;
          const data        = await res.json();
          const competitors = (data.results || []).filter(r => r.price > 0);
          if (competitors.length === 0) return null;

          const cheapest  = competitors[0];
          const yourPrice = product.price || 0;

          // Tenta pegar preço do próprio produto se vier do catálogo
          let realYourPrice = yourPrice;
          if (!realYourPrice && window._catalogCache?.[accountId]) {
            const cached = window._catalogCache[accountId].find(p =>
              p.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0])
            );
            if (cached) realYourPrice = cached.price;
          }

          const diff    = realYourPrice > 0 ? realYourPrice - cheapest.price : 0;
          const diffPct = realYourPrice > 0 ? (diff / realYourPrice) * 100 : 0;

          return {
            name:          product.name,
            yourPrice:     realYourPrice,
            cheapestPrice: cheapest.price,
            cheapestSeller:cheapest.seller?.nickname || '—',
            freeShipping:  cheapest.shipping?.free_shipping || false,
            diff,
            diffPct,
          };
        } catch (_) { return null; }
      })
    );

    const valid = rows.filter(Boolean);
    if (valid.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--color-text-muted);">Não foi possível buscar concorrentes.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    valid.forEach(row => {
      let statusTag;
      if (!row.yourPrice || row.yourPrice === 0) {
        statusTag = `<span class="tag tag--warn">Sem preço</span>`;
      } else if (row.diff > 0) {
        statusTag = `<span class="tag tag--danger">Você está mais caro</span>`;
      } else if (row.diff < 0) {
        statusTag = `<span class="tag tag--ok">Você está mais barato</span>`;
      } else {
        statusTag = `<span class="tag tag--warn">Preço igual</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.name}</td>
        <td>${row.yourPrice > 0 ? formatCurrency(row.yourPrice) : '—'}</td>
        <td>${formatCurrency(row.cheapestPrice)} <span style="color:var(--color-text-faint)">(${row.cheapestSeller}${row.freeShipping ? ' · frete grátis' : ''})</span></td>
        <td style="color:${row.diff > 0 ? 'var(--color-negative)' : row.diff < 0 ? 'var(--color-positive)' : 'inherit'}">${row.diff !== 0 && row.yourPrice > 0 ? formatTrend(-row.diffPct) : '—'}</td>
        <td>—</td>
        <td>${statusTag}</td>`;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.warn('[overview] Concorrentes:', err.message);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--color-text-muted);">Erro ao carregar concorrentes.</td></tr>`;
  }
}

function showOverviewNotConnected(accountId) {
  const accounts = window._mlAccounts || [];
  const account  = accounts.find(a => a.account_id === accountId);
  const name     = account?.account_name || accountId;

  ['kpiSales','kpiRevenue','kpiVisits','kpiConversion'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  ['kpiSalesTrend','kpiRevenueTrend','kpiVisitsTrend','kpiConversionTrend'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.querySelector('#competitorTable tbody').innerHTML = `
    <tr><td colspan="6" style="text-align:center;padding:24px;">
      ⚠️ A loja <strong>${name}</strong> ainda não está conectada.<br>
      <span style="font-size:0.85rem;color:var(--color-text-muted)">Clique em "🔗 Conectar ML" no topo para autorizar.</span>
    </td></tr>`;
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

    // Busca concorrentes reais (sem mock)
    renderCompetitorTable(accountId, data);

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
      document.querySelector('#competitorTable tbody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--color-text-muted);">Dados de exemplo — conecte a conta para ver dados reais.</td></tr>`;
    }
  }
}

function initOverview() {
  loadOverview();
  document.getElementById('refreshOverview').addEventListener('click', loadOverview);
  document.addEventListener('accountChanged', loadOverview);
}
