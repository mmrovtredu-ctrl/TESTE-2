/*
  js/competitors.js — versão com sellers monitorados reais
  Usa /api/competitors-track para os 3 sellers cadastrados +
  /api/search para buscar concorrentes por categoria dos seus produtos.
*/

let priceHistoryChartInstance = null;

// ── Popula seletor de produtos ────────────────────────────────

function populateCompetitorProductSelect() {
  const select    = document.getElementById('competitorProductSelect');
  const accountId = getCurrentAccountId();

  select.innerHTML = '<option value="">Carregando produtos…</option>';

  // Tenta usar o catálogo já carregado em memória
  const catalog = window._catalogCache?.[accountId];
  if (catalog && catalog.length > 0) {
    populateSelectFromCatalog(select, catalog);
    return;
  }

  // Carrega do endpoint se não tiver em cache
  fetch(`/api/catalog?account_id=${accountId}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.products?.length > 0) {
        if (!window._catalogCache) window._catalogCache = {};
        window._catalogCache[accountId] = data.products;
        populateSelectFromCatalog(select, data.products);
      } else {
        // Fallback para mock
        if (typeof MOCK_CATALOG !== 'undefined' && MOCK_CATALOG[accountId]) {
          populateSelectFromCatalog(select, MOCK_CATALOG[accountId]);
        } else {
          select.innerHTML = '<option value="">Nenhum produto encontrado</option>';
        }
      }
    })
    .catch(() => {
      if (typeof MOCK_CATALOG !== 'undefined' && MOCK_CATALOG[accountId]) {
        populateSelectFromCatalog(select, MOCK_CATALOG[accountId]);
      } else {
        select.innerHTML = '<option value="">Erro ao carregar produtos</option>';
      }
    });
}

function populateSelectFromCatalog(select, products) {
  select.innerHTML = '';
  products.forEach(p => {
    const opt   = document.createElement('option');
    opt.value   = JSON.stringify({ id: p.id, name: p.name, price: p.price, category: p.category_id || p.category });
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  loadSelectedCompetitorProduct();
}

// ── Gráfico de histórico (usa dados dos concorrentes rastreados) ──

function renderPriceHistoryChart(yourPrice, competitorPrices) {
  const ctx = document.getElementById('priceHistoryChart');
  if (priceHistoryChartInstance) priceHistoryChartInstance.destroy();

  const labels = Array.from({ length: 14 }, (_, i) => `D${i + 1}`);
  const datasets = [
    {
      label:       'Seu preço',
      data:        Array(14).fill(yourPrice),
      borderColor: '#ffb454',
      borderDash:  [4, 4],
      pointRadius: 0,
      borderWidth: 2,
      fill:        false,
      tension:     0,
    },
    ...competitorPrices.map((cp, i) => ({
      label:           cp.name,
      data:            Array(14).fill(cp.price),
      borderColor:     ['#5b7fff', '#5fd9a4', '#ff7a7a'][i] || '#888',
      pointRadius:     0,
      borderWidth:     2,
      fill:            false,
      tension:         0,
    })),
  ];

  priceHistoryChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8fa3b8', font: { size: 11 } } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5d7186' } },
        y: { grid: { color: '#213548' }, ticks: { color: '#5d7186' } },
      },
    },
  });
}

// ── Tabela de concorrentes rastreados ─────────────────────────

async function renderTrackedCompetitorsTable(selectedProduct) {
  const tbody = document.querySelector('#competitorDetailTable tbody');
  tbody.innerHTML = `
    <tr><td colspan="7" style="text-align:center;padding:16px;">
      <div class="loading-row" style="justify-content:center;">
        <span class="spinner"></span><span>Buscando concorrentes monitorados…</span>
      </div>
    </td></tr>
  `;

  try {
    // Busca os 3 sellers monitorados
    const catParam = selectedProduct?.category ? `&category_id=${selectedProduct.category}` : '';
    const res      = await fetch(`/api/competitors-track${catParam}`);
    const data     = res.ok ? await res.json() : { competitors: [] };

    const competitors = data.competitors || [];

    if (competitors.length === 0 || competitors.every(c => c.products.length === 0)) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted);">Nenhum produto encontrado para os concorrentes monitorados.</td></tr>`;
      return;
    }

    // Para cada concorrente, pega o produto mais relevante para comparar
    const rows = [];
    competitors.forEach(comp => {
      if (comp.products.length === 0) return;

      // Tenta encontrar o produto mais parecido com o selecionado
      let bestProduct = comp.products[0];
      if (selectedProduct?.name) {
        const query   = selectedProduct.name.toLowerCase();
        const found   = comp.products.find(p => p.title.toLowerCase().includes(query.split(' ')[0]));
        if (found) bestProduct = found;
      }

      rows.push({
        seller:       comp.name,
        reputation:   comp.reputation || '—',
        positive_pct: comp.positive_pct,
        power_seller: comp.power_seller,
        price:        bestProduct.price,
        free_shipping:bestProduct.free_shipping,
        sold:         bestProduct.sold_quantity,
        title:        bestProduct.title,
        permalink:    bestProduct.permalink,
        stats:        comp.stats,
      });
    });

    // Atualiza gráfico com preços dos concorrentes
    if (selectedProduct?.price) {
      renderPriceHistoryChart(
        selectedProduct.price,
        rows.map(r => ({ name: r.seller, price: r.price }))
      );
    }

    // Renderiza tabela
    tbody.innerHTML = '';
    rows.forEach(row => {
      const reputationMap = {
        '1_red':    '<span class="tag tag--danger">Novo</span>',
        '2_orange': '<span class="tag tag--warn">Regular</span>',
        '3_yellow': '<span class="tag tag--warn">Bom</span>',
        '4_light_green': '<span class="tag tag--ok">Muito bom</span>',
        '5_green': '<span class="tag tag--ok">Excelente</span>',
      };
      const repTag     = reputationMap[row.reputation] || `<span class="tag">${row.reputation}</span>`;
      const psTag      = row.power_seller ? `<span class="tag tag--ok">ML ${row.power_seller}</span>` : '';
      const shippingTd = row.free_shipping ? '<span class="tag tag--ok">Grátis</span>' : 'Pago';

      const yourPrice  = selectedProduct?.price || 0;
      const diff       = yourPrice > 0 ? yourPrice - row.price : 0;
      const priceStyle = diff > 0 ? 'color:var(--color-negative)' : diff < 0 ? 'color:var(--color-positive)' : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="${row.permalink || '#'}" target="_blank" rel="noopener" title="${row.title}">${row.seller}</a></td>
        <td style="${priceStyle};font-weight:600;">${formatCurrency(row.price)}</td>
        <td>—</td>
        <td>${formatNumber(row.sold)}</td>
        <td>${repTag} ${psTag}</td>
        <td>★ ${row.positive_pct}% (${formatNumber(row.stats?.transactions || 0)})</td>
        <td>${shippingTd}</td>
      `;
      tbody.appendChild(tr);
    });

    // Adiciona linha de média da concorrência
    if (rows.length > 0) {
      const avgPrice = rows.reduce((s, r) => s + r.price, 0) / rows.length;
      const tr       = document.createElement('tr');
      tr.style.cssText = 'background:var(--color-bg-elevated-2);font-weight:600;';
      tr.innerHTML = `
        <td>Média concorrentes</td>
        <td>${formatCurrency(avgPrice)}</td>
        <td colspan="5" style="color:var(--color-text-muted);font-size:0.8rem;">
          ${selectedProduct?.price ? `Seu preço: ${formatCurrency(selectedProduct.price)} — Diferença: ${formatTrend(((selectedProduct.price - avgPrice) / avgPrice) * 100)}` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    }

  } catch (err) {
    console.warn('[competitors] Erro:', err.message);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted);">Erro ao carregar concorrentes.</td></tr>`;
  }
}

// ── Produto selecionado ────────────────────────────────────────

function loadSelectedCompetitorProduct() {
  const select = document.getElementById('competitorProductSelect');
  if (!select.value) return;

  let selectedProduct = null;
  try { selectedProduct = JSON.parse(select.value); } catch (_) {}

  renderTrackedCompetitorsTable(selectedProduct);
}

// ── Init ──────────────────────────────────────────────────────

function initCompetitors() {
  populateCompetitorProductSelect();

  document.getElementById('competitorProductSelect')?.addEventListener('change', loadSelectedCompetitorProduct);
  document.addEventListener('accountChanged', () => {
    populateCompetitorProductSelect();
  });
}
