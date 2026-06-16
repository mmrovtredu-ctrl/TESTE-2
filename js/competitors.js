/*
  js/competitors.js — busca concorrentes pelo PRODUTO selecionado
  Fluxo: você escolhe um produto do seu catálogo → o sistema busca
  no Mercado Livre quem vende o mesmo produto e mostra preço,
  estoque, vendas, reputação, avaliação, frete e nome do vendedor.
*/

let priceHistoryChartInstance = null;

// ── Popula o seletor com os produtos do SEU catálogo ──────────
function populateCompetitorProductSelect() {
  const select    = document.getElementById('competitorProductSelect');
  const accountId = getCurrentAccountId();

  select.innerHTML = '<option value="">Carregando seus produtos…</option>';

  const catalog = window._catalogCache?.[accountId];
  if (catalog && catalog.length > 0) {
    populateSelectFromCatalog(select, catalog);
    return;
  }

  fetch(`/api/catalog?account_id=${accountId}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.products?.length > 0) {
        if (!window._catalogCache) window._catalogCache = {};
        window._catalogCache[accountId] = data.products;
        populateSelectFromCatalog(select, data.products);
      } else {
        select.innerHTML = '<option value="">Nenhum produto encontrado nesta conta</option>';
      }
    })
    .catch(() => {
      select.innerHTML = '<option value="">Erro ao carregar seus produtos</option>';
    });
}

function populateSelectFromCatalog(select, products) {
  select.innerHTML = '';
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ name: p.name, price: p.price });
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  loadSelectedCompetitorProduct();
}

// ── Gráfico: seu preço vs preços dos concorrentes ─────────────
function renderPriceHistoryChart(yourPrice, competitorPrices) {
  const ctx = document.getElementById('priceHistoryChart');
  if (priceHistoryChartInstance) priceHistoryChartInstance.destroy();

  const labels = competitorPrices.map(c => c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name);
  priceHistoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Seu preço', ...labels],
      datasets: [{
        label: 'Preço (R$)',
        data: [yourPrice || 0, ...competitorPrices.map(c => c.price)],
        backgroundColor: ['#ffb454', ...competitorPrices.map(() => '#5fb3d9')],
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5d7186', font: { size: 10 } } },
        y: { grid: { color: '#213548' }, ticks: { color: '#5d7186' }, beginAtZero: true },
      },
    },
  });
}

// ── Busca concorrentes do produto escolhido ───────────────────
async function searchCompetitorsForProduct(product) {
  const tbody = document.querySelector('#competitorDetailTable tbody');
  tbody.innerHTML = `
    <tr><td colspan="7" style="text-align:center;padding:16px;">
      <div class="loading-row" style="justify-content:center;">
        <span class="spinner"></span><span>Buscando quem vende esse produto no Mercado Livre…</span>
      </div>
    </td></tr>`;

  try {
    // 1) Busca aberta no ML pelo nome do seu produto
    const res  = await fetch(`/api/search?q=${encodeURIComponent(product.name)}&limit=12`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na busca.');

    let items = data.items || [];

    // 2) Mantém 1 anúncio por vendedor (o mais barato de cada)
    const bySeller = {};
    items.forEach(it => {
      const key = it.seller_id || it.seller;
      if (!key) return;
      if (!bySeller[key] || it.price < bySeller[key].price) bySeller[key] = it;
    });
    let sellers = Object.values(bySeller)
      .filter(s => s.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 8);

    if (sellers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted);">Nenhum concorrente encontrado para este produto.</td></tr>`;
      return;
    }

    // 3) Enriquece com reputação de cada vendedor (API pública do ML)
    await Promise.allSettled(sellers.map(async s => {
      if (!s.seller_id) return;
      try {
        const uRes = await fetch(`https://api.mercadolibre.com/users/${s.seller_id}`);
        if (uRes.ok) {
          const u = await uRes.json();
          s._rep   = u.seller_reputation?.level_id || null;
          const tx = u.seller_reputation?.transactions || {};
          s._txTotal   = tx.total || 0;
          s._positive  = typeof tx.ratings?.positive === 'number' ? tx.ratings.positive : null;
          s._nickname  = u.nickname || s.seller;
        }
      } catch (_) {}
    }));

    // 4) Atualiza o gráfico de barras
    renderPriceHistoryChart(product.price, sellers.map(s => ({ name: s._nickname || s.seller, price: s.price })));

    // 5) Renderiza a tabela
    const repMap = {
      '5_green':       '<span class="tag tag--ok">Excelente</span>',
      '4_light_green': '<span class="tag tag--ok">Muito bom</span>',
      '3_yellow':      '<span class="tag tag--warn">Bom</span>',
      '2_orange':      '<span class="tag tag--warn">Regular</span>',
      '1_red':         '<span class="tag tag--danger">Ruim</span>',
    };

    tbody.innerHTML = '';
    sellers.forEach(s => {
      const repTag    = repMap[s._rep] || '<span style="color:var(--color-text-faint)">—</span>';
      const aval      = s._positive != null ? `★ ${Math.round(s._positive * 100)}%` : '—';
      const avalMeta  = s._txTotal ? ` <span style="color:var(--color-text-faint)">(${formatNumber(s._txTotal)})</span>` : '';
      const frete     = s.free_shipping ? '<span class="tag tag--ok">Grátis</span>' : 'Pago';
      const diff      = (product.price > 0) ? product.price - s.price : 0;
      const priceCol  = diff > 0 ? 'var(--color-negative)' : diff < 0 ? 'var(--color-positive)' : 'inherit';
      const nome      = s._nickname || s.seller || 'Vendedor';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="${s.permalink || '#'}" target="_blank" rel="noopener" title="${s.title || ''}">${nome}</a></td>
        <td style="color:${priceCol};font-weight:600;">${formatCurrency(s.price)}</td>
        <td>—</td>
        <td>${formatNumber(s.sold_quantity || 0)}</td>
        <td>${repTag}</td>
        <td>${aval}${avalMeta}</td>
        <td>${frete}</td>`;
      tbody.appendChild(tr);
    });

    // 6) Linha de média da concorrência + comparação com seu preço
    const avg = sellers.reduce((sum, s) => sum + s.price, 0) / sellers.length;
    const trAvg = document.createElement('tr');
    trAvg.style.cssText = 'background:var(--color-bg-elevated-2);font-weight:600;';
    const seuVs = product.price > 0
      ? `Seu preço: ${formatCurrency(product.price)} — ${product.price > avg ? 'acima' : 'abaixo'} da média (${formatTrend(((product.price - avg) / avg) * 100)})`
      : 'Defina seu preço no catálogo para comparar';
    trAvg.innerHTML = `
      <td>Média concorrentes</td>
      <td>${formatCurrency(avg)}</td>
      <td colspan="5" style="color:var(--color-text-muted);font-size:0.8rem;">${seuVs}</td>`;
    tbody.appendChild(trAvg);

  } catch (err) {
    console.warn('[competitors] Erro:', err.message);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted);">Erro ao buscar concorrentes. Tente outro produto.</td></tr>`;
  }
}

// ── Produto selecionado ───────────────────────────────────────
function loadSelectedCompetitorProduct() {
  const select = document.getElementById('competitorProductSelect');
  if (!select.value) return;
  let product = null;
  try { product = JSON.parse(select.value); } catch (_) {}
  if (product) searchCompetitorsForProduct(product);
}

// ── Init ──────────────────────────────────────────────────────
function initCompetitors() {
  populateCompetitorProductSelect();
  document.getElementById('competitorProductSelect')?.addEventListener('change', loadSelectedCompetitorProduct);
  document.addEventListener('accountChanged', () => populateCompetitorProductSelect());
}
