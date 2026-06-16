/*
  js/competitors.js — versão LINK do produto (cola o link e vê concorrentes)
  Cola o link de um produto do Mercado Livre e mostra:
   - o produto colado (em cima)
   - os vendedores que vendem o mesmo produto (embaixo, na tabela de 7 colunas)
  Backend: /api/competitors-track?link=...&account_id=...
*/

let priceHistoryChartInstance = null;

// ── Cria a barra de "colar link" dentro da aba Concorrentes ───
function ensureCompetitorLinkBar() {
  if (document.getElementById('competitorLinkBar')) return;

  const table = document.getElementById('competitorDetailTable');
  if (!table) return;

  // Esconde o seletor antigo de produtos (não usamos mais)
  const oldSelect = document.getElementById('competitorProductSelect');
  if (oldSelect) {
    const wrap = oldSelect.closest('div') || oldSelect;
    wrap.style.display = 'none';
  }

  // Ponto de inserção: antes do "card" que contém a tabela
  const card = table.closest('.card, .panel, section, div');
  const anchor = card || table;

  const bar = document.createElement('div');
  bar.id = 'competitorLinkBar';
  bar.style.cssText = 'margin:0 0 16px 0;display:flex;flex-direction:column;gap:8px;';
  bar.innerHTML = `
    <label style="font-size:0.85rem;color:var(--color-text-muted,#8fa3b8);">
      Cole o link de um produto do Mercado Livre para ver a concorrência
    </label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <input id="competitorLinkInput" type="text"
        placeholder="https://www.mercadolivre.com.br/.../p/MLB..."
        style="flex:1;min-width:240px;padding:10px 12px;border-radius:8px;
               border:1px solid var(--color-border,#213548);
               background:var(--color-bg-elevated,#0f1b29);
               color:var(--color-text,#e6eef6);font-size:0.9rem;" />
      <button id="competitorLinkBtn"
        style="padding:10px 18px;border:none;border-radius:8px;cursor:pointer;
               background:var(--color-accent,#ffb454);color:#1a1206;
               font-weight:600;font-size:0.9rem;">Buscar concorrentes</button>
    </div>
    <div id="competitorProductHeader"></div>
  `;

  anchor.parentNode.insertBefore(bar, anchor);

  document.getElementById('competitorLinkBtn')
    .addEventListener('click', runCompetitorSearch);
  document.getElementById('competitorLinkInput')
    .addEventListener('keydown', e => { if (e.key === 'Enter') runCompetitorSearch(); });
}

// ── Dispara a busca ───────────────────────────────────────────
async function runCompetitorSearch() {
  const input = document.getElementById('competitorLinkInput');
  const link = (input?.value || '').trim();
  const headerBox = document.getElementById('competitorProductHeader');
  const tbody = document.querySelector('#competitorDetailTable tbody');

  if (!link) {
    if (headerBox) headerBox.innerHTML =
      `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">Cole um link primeiro.</p>`;
    return;
  }

  if (headerBox) headerBox.innerHTML = '';
  if (tbody) tbody.innerHTML = `
    <tr><td colspan="7" style="text-align:center;padding:18px;">
      <div class="loading-row" style="justify-content:center;">
        <span class="spinner"></span><span>Buscando o produto e a concorrência…</span>
      </div>
    </td></tr>`;

  const accountId = (typeof getCurrentAccountId === 'function') ? getCurrentAccountId() : 'acc_1';

  try {
    const res = await fetch(
      `/api/competitors-track?link=${encodeURIComponent(link)}&account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok || !data.ok) {
      const msg = data?.error || 'Não consegui buscar esse produto.';
      if (headerBox) headerBox.innerHTML =
        `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">${msg}</p>`;
      if (tbody) tbody.innerHTML =
        `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted,#8fa3b8);">—</td></tr>`;
      return;
    }

    renderProductHeader(data.product);
    renderCompetitors(data.product, data.competitors || []);
  } catch (err) {
    if (headerBox) headerBox.innerHTML =
      `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">Erro de conexão. Tente de novo.</p>`;
  }
}

// ── Produto colado (cabeçalho, em cima) ───────────────────────
function renderProductHeader(product) {
  const box = document.getElementById('competitorProductHeader');
  if (!box || !product) return;

  const priceLabel = product.catalog ? 'Menor preço (catálogo)' : 'Preço do anúncio';
  const priceTxt = (product.price != null && typeof formatCurrency === 'function')
    ? formatCurrency(product.price)
    : (product.price != null ? `R$ ${product.price}` : '—');

  box.innerHTML = `
    <div style="display:flex;gap:14px;align-items:center;margin-top:10px;padding:12px;
                border:1px solid var(--color-border,#213548);border-radius:10px;
                background:var(--color-bg-elevated,#0f1b29);">
      ${product.thumbnail
        ? `<img src="${product.thumbnail}" alt="" style="width:64px;height:64px;object-fit:contain;border-radius:8px;background:#fff;" />`
        : ''}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;color:var(--color-text,#e6eef6);
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${product.title || product.id}
        </div>
        <div style="font-size:0.82rem;color:var(--color-text-muted,#8fa3b8);margin-top:2px;">
          ${priceLabel}: <strong style="color:var(--color-accent,#ffb454);">${priceTxt}</strong>
        </div>
      </div>
      ${product.permalink
        ? `<a href="${product.permalink}" target="_blank" rel="noopener"
             style="font-size:0.82rem;color:var(--color-info,#5fb3d9);white-space:nowrap;">Ver no ML ↗</a>`
        : ''}
    </div>`;
}

// ── Tabela de concorrentes (7 colunas) ────────────────────────
function renderCompetitors(product, competitors) {
  const tbody = document.querySelector('#competitorDetailTable tbody');
  if (!tbody) return;

  if (!competitors.length) {
    tbody.innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--color-text-muted,#8fa3b8);">
         Não encontrei outros vendedores para esse produto.
       </td></tr>`;
    renderPriceBarChart(product?.price || null, []);
    return;
  }

  const repMap = {
    '1_red':        '<span class="tag tag--danger">Novo</span>',
    '2_orange':     '<span class="tag tag--warn">Regular</span>',
    '3_yellow':     '<span class="tag tag--warn">Bom</span>',
    '4_light_green':'<span class="tag tag--ok">Muito bom</span>',
    '5_green':      '<span class="tag tag--ok">Excelente</span>',
  };
  const fmtCur = (v) => (typeof formatCurrency === 'function') ? formatCurrency(v) : `R$ ${v}`;
  const fmtNum = (v) => (typeof formatNumber === 'function') ? formatNumber(v) : v;

  const yourPrice = product?.price ?? null;

  tbody.innerHTML = '';
  competitors.forEach(c => {
    const rep = c.level_id ? (repMap[c.level_id] || `<span class="tag">${c.level_id}</span>`) : '—';
    const ps  = c.power_seller ? ` <span class="tag tag--ok">ML ${c.power_seller}</span>` : '';
    const aval = (c.positive_pct != null)
      ? `★ ${c.positive_pct}%${c.total_ratings ? ` (${fmtNum(c.total_ratings)})` : ''}`
      : '—';
    const frete = c.free_shipping === true ? '<span class="tag tag--ok">Grátis</span>'
                : c.free_shipping === false ? 'Pago' : '—';
    const estoque = (c.available != null) ? fmtNum(c.available) : '—';
    const vendas  = (c.sold != null) ? fmtNum(c.sold) : '—';

    let priceStyle = 'font-weight:600;';
    if (yourPrice != null && c.price != null) {
      if (c.price < yourPrice) priceStyle += 'color:var(--color-positive,#5fd9a4);';
      else if (c.price > yourPrice) priceStyle += 'color:var(--color-negative,#ff7a7a);';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a href="${c.permalink || '#'}" target="_blank" rel="noopener" title="${(c.title || '').replace(/"/g,'')}">${c.seller}</a></td>
      <td style="${priceStyle}">${c.price != null ? fmtCur(c.price) : '—'}</td>
      <td>${estoque}</td>
      <td>${vendas}</td>
      <td>${rep}${ps}</td>
      <td>${aval}</td>
      <td>${frete}</td>`;
    tbody.appendChild(tr);
  });

  // Linha de média da concorrência
  const prices = competitors.map(c => c.price).filter(p => typeof p === 'number');
  if (prices.length) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const tr = document.createElement('tr');
    tr.style.cssText = 'background:var(--color-bg-elevated-2,#16273a);font-weight:600;';
    let cmp = '';
    if (yourPrice != null && typeof formatTrend === 'function') {
      cmp = ` — Produto: ${fmtCur(yourPrice)} (${formatTrend(((yourPrice - avg) / avg) * 100)})`;
    }
    tr.innerHTML = `
      <td>Média concorrentes</td>
      <td>${fmtCur(avg)}</td>
      <td colspan="5" style="color:var(--color-text-muted,#8fa3b8);font-size:0.8rem;">${cmp}</td>`;
    tbody.appendChild(tr);
  }

  renderPriceBarChart(yourPrice, competitors);
}

// ── Gráfico de barras: produto vs concorrentes ────────────────
function renderPriceBarChart(yourPrice, competitors) {
  const ctx = document.getElementById('priceHistoryChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (priceHistoryChartInstance) priceHistoryChartInstance.destroy();

  const labels = [];
  const values = [];
  const colors = [];

  if (yourPrice != null) {
    labels.push('Produto');
    values.push(yourPrice);
    colors.push('#ffb454');
  }
  competitors.forEach((c, i) => {
    if (c.price == null) return;
    labels.push((c.seller || `V${i + 1}`).slice(0, 14));
    values.push(c.price);
    colors.push('#5fb3d9');
  });

  if (!values.length) return;

  priceHistoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Preço (R$)', data: values, backgroundColor: colors }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5d7186', font: { size: 10 } } },
        y: { grid: { color: '#213548' }, ticks: { color: '#5d7186' } },
      },
    },
  });
}

// ── Init ──────────────────────────────────────────────────────
function initCompetitors() {
  ensureCompetitorLinkBar();
  document.addEventListener('accountChanged', () => {
    // mantém o resultado; só re-busca se já houver link digitado
    const input = document.getElementById('competitorLinkInput');
    if (input && input.value.trim()) runCompetitorSearch();
  });
}
