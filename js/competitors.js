/*
  js/competitors.js — recebe o produto IGUAL ao Marketing
  -------------------------------------------------------
  A aba Concorrentes agora aceita as DUAS formas, exatamente como a
  aba Marketing:
   1. Cole o LINK (catálogo /p/MLB... ou anúncio MLB-...) → analisa direto
   2. Digite o NOME do produto → busca no ML (/api/search), mostra os
      resultados em cards e, ao clicar num card, analisa a concorrência
      daquele produto.

  O que ela FAZ continua igual: chama /api/competitors-track e mostra
  o produto escolhido + os vendedores concorrentes + o gráfico.
  Só mudou COMO o link chega até a busca.
*/

let priceHistoryChartInstance = null;

// ── É link/ID do ML? (mesma regra do Marketing) ───────────────
function isMLLink(text) {
  return text.includes('mercadolivre.com')
      || text.includes('mercadolibre.com')
      || /^MLB\d+$/i.test(text.trim());
}

// ── Cria a barra de busca (link OU nome) + caixa de cards ─────
function ensureCompetitorLinkBar() {
  if (document.getElementById('competitorLinkBar')) return;

  const table = document.getElementById('competitorDetailTable');
  if (!table) return;

  // Esconde o seletor antigo de produtos (não usamos mais)
  const oldSelect = document.getElementById('competitorProductSelect');
  if (oldSelect) {
    const wrap = oldSelect.closest('.panel') || oldSelect.closest('div') || oldSelect;
    wrap.style.display = 'none';
  }

  // Ponto de inserção: antes do "card" que contém a tabela
  const card = table.closest('.card, .panel, section, div');
  const anchor = card || table;

  // Barra de entrada (link ou nome) — usa .form-row/.input/.btn (responsivos)
  const bar = document.createElement('div');
  bar.id = 'competitorLinkBar';
  bar.className = 'panel';
  bar.style.cssText = 'margin:0 0 16px 0;';
  bar.innerHTML = `
    <label class="form-hint" style="display:block;margin-bottom:8px;">
      Cole o <strong>link</strong> (catálogo /p/MLB... ou anúncio MLB-...) ou digite o <strong>nome</strong> do produto
    </label>
    <div class="form-row">
      <input id="competitorLinkInput" type="text" class="input"
        placeholder="Link do Mercado Livre ou nome do produto" />
      <button id="competitorLinkBtn" class="btn btn--primary">Buscar concorrentes</button>
    </div>
    <div id="competitorProductHeader"></div>
  `;
  anchor.parentNode.insertBefore(bar, anchor);

  // Caixa de resultados da busca por NOME (cards) — igual ao Marketing
  const searchBox = document.createElement('div');
  searchBox.id = 'competitorSearchResults';
  searchBox.className = 'panel is-hidden';
  searchBox.innerHTML = `
    <div class="panel__header">
      <h2>Selecione o produto para ver os concorrentes</h2>
      <span class="panel__hint" id="competitorSearchCount">—</span>
    </div>
    <div id="competitorSearchGrid" style="display:flex;flex-direction:column;gap:8px;"></div>
  `;
  bar.parentNode.insertBefore(searchBox, bar.nextSibling);

  const input = document.getElementById('competitorLinkInput');
  const btn   = document.getElementById('competitorLinkBtn');

  btn.addEventListener('click', handleCompetitorInput);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleCompetitorInput(); });

  // Busca em tempo real ao digitar o nome (debounce 600ms) — igual ao Marketing
  let debounceTimer;
  input.addEventListener('input', () => {
    const value = input.value.trim();
    clearTimeout(debounceTimer);
    if (value.length < 2 || isMLLink(value)) {
      searchBox.classList.add('is-hidden');
      return;
    }
    debounceTimer = setTimeout(() => searchMLCompetitors(value), 600);
  });
}

// ── Decide: link → analisa direto / nome → busca cards ────────
function handleCompetitorInput() {
  const input = document.getElementById('competitorLinkInput');
  const value = (input?.value || '').trim();

  if (!value) {
    const headerBox = document.getElementById('competitorProductHeader');
    if (headerBox) headerBox.innerHTML =
      `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">Cole um link ou digite o nome do produto.</p>`;
    return;
  }

  if (isMLLink(value)) {
    runCompetitorSearch();          // é link/ID → vai direto
  } else {
    searchMLCompetitors(value);     // é texto → busca no ML primeiro
  }
}

// ── Busca por nome no ML (mesma API do Marketing) ─────────────
async function searchMLCompetitors(query) {
  const btn = document.getElementById('competitorLinkBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando…'; }

  try {
    const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na busca.');
    renderCompetitorSearchResults(data.items || [], data.total || 0);
  } catch (err) {
    const headerBox = document.getElementById('competitorProductHeader');
    if (headerBox) headerBox.innerHTML =
      `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">${err.message || 'Erro ao buscar no Mercado Livre.'}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Buscar concorrentes'; }
  }
}

// ── Cards de resultado (igual ao Marketing) ───────────────────
function renderCompetitorSearchResults(items, total) {
  const box   = document.getElementById('competitorSearchResults');
  const grid  = document.getElementById('competitorSearchGrid');
  const count = document.getElementById('competitorSearchCount');
  if (!box || !grid) return;

  count.textContent = `${total.toLocaleString('pt-BR')} resultados — mostrando ${items.length}`;
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = `<p class="form-hint">Nenhum resultado encontrado. Tente outra busca.</p>`;
    box.classList.remove('is-hidden');
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;align-items:center;gap:12px;padding:10px 14px;
      background:var(--color-bg);border:1px solid var(--color-border);
      border-radius:var(--radius-sm);cursor:pointer;transition:border-color .15s;
    `;
    card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--color-accent)'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--color-border)'; });

    const imgHtml = item.thumbnail
      ? `<img src="${item.thumbnail}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:4px;flex-shrink:0;">`
      : `<div style="width:48px;height:48px;background:var(--color-bg-elevated-2);border-radius:4px;flex-shrink:0;"></div>`;

    const shipping = item.free_shipping
      ? `<span class="tag tag--ok" style="font-size:0.65rem;">Frete grátis</span>` : '';

    card.innerHTML = `
      ${imgHtml}
      <div style="flex:1;min-width:0;">
        <p style="font-size:0.85rem;font-weight:600;margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</p>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:700;">${formatCurrency(item.price)}</span>
          <span style="font-size:0.75rem;color:var(--color-text-muted);">${item.sold_quantity} vendidos</span>
          <span style="font-size:0.75rem;color:var(--color-text-muted);">${item.seller}</span>
          ${shipping}
        </div>
      </div>
      <span style="font-size:0.75rem;color:var(--color-accent);font-weight:600;flex-shrink:0;">Ver concorrentes →</span>
    `;

    // Ao clicar no card: joga o link no input e dispara a análise (igual Marketing)
    card.addEventListener('click', () => {
      const input = document.getElementById('competitorLinkInput');
      input.value = item.permalink || item.ml_link;
      box.classList.add('is-hidden');
      runCompetitorSearch();
    });

    grid.appendChild(card);
  });

  box.classList.remove('is-hidden');
}

// ── Dispara a busca de concorrentes (backend INALTERADO) ──────
async function runCompetitorSearch() {
  const input     = document.getElementById('competitorLinkInput');
  const link      = (input?.value || '').trim();
  const headerBox = document.getElementById('competitorProductHeader');
  const tbody     = document.querySelector('#competitorDetailTable tbody');

  // Esconde os cards de busca por nome, se estiverem abertos
  const searchBox = document.getElementById('competitorSearchResults');
  if (searchBox) searchBox.classList.add('is-hidden');

  if (!link) {
    if (headerBox) headerBox.innerHTML =
      `<p style="color:var(--color-negative,#ff7a7a);margin:6px 0;">Cole um link ou selecione um produto primeiro.</p>`;
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

// ── Produto escolhido (cabeçalho, em cima) ────────────────────
function renderProductHeader(product) {
  const box = document.getElementById('competitorProductHeader');
  if (!box || !product) return;

  const priceLabel = product.catalog ? 'Menor preço (catálogo)' : 'Preço do anúncio';
  const priceTxt = (product.price != null && typeof formatCurrency === 'function')
    ? formatCurrency(product.price)
    : (product.price != null ? `R$ ${product.price}` : '—');

  box.innerHTML = `
    <div style="display:flex;gap:14px;align-items:center;margin-top:12px;padding:12px;
                border:1px solid var(--color-border,#213548);border-radius:10px;
                background:var(--color-bg,#0b1620);">
      ${product.thumbnail
        ? `<img src="${product.thumbnail}" alt="" style="width:64px;height:64px;object-fit:contain;border-radius:8px;background:#fff;flex-shrink:0;" />`
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
             style="font-size:0.82rem;color:var(--color-info,#5fb3d9);white-space:nowrap;flex-shrink:0;">Ver no ML ↗</a>`
        : ''}
    </div>`;
}

// ── Tabela de concorrentes (7 colunas / cards no mobile) ──────
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

    // data-label = nome da coluna, usado para virar "cards" no celular
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Vendedor"><a href="${c.permalink || '#'}" target="_blank" rel="noopener" title="${(c.title || '').replace(/"/g,'')}">${c.seller}</a></td>
      <td data-label="Preço" style="${priceStyle}">${c.price != null ? fmtCur(c.price) : '—'}</td>
      <td data-label="Estoque">${estoque}</td>
      <td data-label="Vendas (30d)">${vendas}</td>
      <td data-label="Reputação">${rep}${ps}</td>
      <td data-label="Avaliação">${aval}</td>
      <td data-label="Frete">${frete}</td>`;
    tbody.appendChild(tr);
  });

  // Linha de média da concorrência
  const prices = competitors.map(c => c.price).filter(p => typeof p === 'number');
  if (prices.length) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const tr = document.createElement('tr');
    tr.className = 'competitor-avg-row';
    tr.style.cssText = 'background:var(--color-bg-elevated-2,#16273a);font-weight:600;';
    let cmp = '';
    if (yourPrice != null && typeof formatTrend === 'function') {
      cmp = ` — Produto: ${fmtCur(yourPrice)} (${formatTrend(((yourPrice - avg) / avg) * 100)})`;
    }
    tr.innerHTML = `
      <td data-label="Resumo">Média concorrentes</td>
      <td data-label="Preço médio">${fmtCur(avg)}</td>
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
      maintainAspectRatio: false,
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
    // Mantém o resultado; só re-busca se já houver um LINK digitado
    const input = document.getElementById('competitorLinkInput');
    const value = (input?.value || '').trim();
    if (value && isMLLink(value)) runCompetitorSearch();
  });
}
