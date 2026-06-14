/*
  js/analyzer.js — com busca real no ML
  A barra de pesquisa agora:
  1. Aceita texto livre OU link do ML
  2. Se for texto, busca no ML via /api/search e mostra cards
  3. Usuário clica no card para selecionar o produto
  4. Roda a análise completa no produto selecionado
*/

function initAnalyzer() {
  const form      = document.getElementById('analyzerForm');
  const input     = document.getElementById('analyzerInput');
  const loading   = document.getElementById('analyzerLoading');
  const result    = document.getElementById('analyzerResult');
  const fullAnal  = document.getElementById('analyzerFullAnalysis');
  const submitBtn = document.getElementById('analyzerSubmit');

  if (!form) return;

  // Container de resultados de busca (injetado dinamicamente)
  let searchResultsBox = null;

  function getOrCreateSearchBox() {
    if (!searchResultsBox) {
      searchResultsBox = document.createElement('div');
      searchResultsBox.id        = 'analyzerSearchResults';
      searchResultsBox.className = 'panel is-hidden';
      searchResultsBox.innerHTML = `
        <div class="panel__header">
          <h2>Selecione o produto para analisar</h2>
          <span class="panel__hint" id="analyzerSearchCount">—</span>
        </div>
        <div id="analyzerSearchGrid" style="display:flex;flex-direction:column;gap:8px;"></div>
      `;
      form.parentNode.insertBefore(searchResultsBox, form.nextSibling);
    }
    return searchResultsBox;
  }

  function isMLLink(text) {
    return text.includes('mercadolivre.com') || text.includes('mercadolibre.com') || /^MLB\d+$/i.test(text.trim());
  }

  // ── Busca por texto no ML ─────────────────────────────────

  async function searchML(query) {
    submitBtn.disabled  = true;
    submitBtn.textContent = 'Buscando…';
    result.classList.add('is-hidden');
    fullAnal.classList.add('is-hidden');

    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro na busca.');

      renderSearchResults(data.items, data.total);

    } catch (err) {
      alert(err.message || 'Erro ao buscar no Mercado Livre.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Analisar';
    }
  }

  function renderSearchResults(items, total) {
    const box   = getOrCreateSearchBox();
    const grid  = document.getElementById('analyzerSearchGrid');
    const count = document.getElementById('analyzerSearchCount');

    count.textContent = `${total.toLocaleString('pt-BR')} resultados — mostrando ${items.length}`;
    grid.innerHTML    = '';

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

      const shipping = item.free_shipping ? `<span class="tag tag--ok" style="font-size:0.65rem;">Frete grátis</span>` : '';

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
        <span style="font-size:0.75rem;color:var(--color-accent);font-weight:600;flex-shrink:0;">Analisar →</span>
      `;

      card.addEventListener('click', () => {
        input.value = item.permalink || item.ml_link;
        box.classList.add('is-hidden');
        runAnalysis(item.permalink || item.ml_link);
      });

      grid.appendChild(card);
    });

    box.classList.remove('is-hidden');
  }

  // ── Análise via backend ───────────────────────────────────

  async function runAnalysis(link) {
    result.classList.add('is-hidden');
    fullAnal.classList.add('is-hidden');
    loading.classList.remove('is-hidden');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Analisando…';

    const box = document.getElementById('analyzerSearchResults');
    if (box) box.classList.add('is-hidden');

    try {
      const response = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ link }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao analisar produto.');

      renderAnalyzerFromAPI(data);
      loading.classList.add('is-hidden');
      fullAnal.classList.remove('is-hidden');

    } catch (error) {
      loading.classList.add('is-hidden');
      alert(error.message || 'Erro inesperado. Tente novamente.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Analisar';
    }
  }

  // ── Submit do formulário ──────────────────────────────────

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    if (isMLLink(value)) {
      // É um link ou ID direto — vai direto para análise
      await runAnalysis(value);
    } else {
      // É texto livre — busca no ML primeiro
      await searchML(value);
    }
  });

  // Busca em tempo real ao digitar (debounce de 600ms)
  let debounceTimer;
  input.addEventListener('input', () => {
    const value = input.value.trim();
    clearTimeout(debounceTimer);

    const box = document.getElementById('analyzerSearchResults');
    if (box && (value.length < 2 || isMLLink(value))) {
      box.classList.add('is-hidden');
      return;
    }

    if (value.length >= 2 && !isMLLink(value)) {
      debounceTimer = setTimeout(() => searchML(value), 600);
    }
  });

  document.getElementById('applySuggestion')?.addEventListener('click', () => {
    alert('Em produção: isso enviaria a sugestão para atualizar o anúncio no Mercado Livre.');
  });
}

// ── Renderiza o resultado da análise ─────────────────────────

function renderAnalyzerFromAPI(data) {
  const verdictColors = { 'OPORTUNIDADE': 'tag--ok', 'COMPETITIVO': 'tag--warn', 'SATURADO': 'tag--danger' };
  const verdictCls    = verdictColors[data.verdict] || 'tag--warn';

  document.getElementById('anzVerdict').innerHTML = `
    <div class="result-block__field">
      <span class="tag ${verdictCls}" style="font-size:0.9rem;padding:6px 14px;">${data.verdict || '—'}</span>
    </div>
    <div class="result-block__field">
      <span>Por quê</span>
      <p>${data.verdict_explanation || ''}</p>
    </div>
  `;

  document.getElementById('anzMarketPotential').textContent = data.market_potential?.label || '—';
  document.getElementById('anzCompetitiveness').textContent = data.competitiveness?.label  || '—';
  document.getElementById('anzConversion').textContent      = '—';
  document.getElementById('anzAvgPrice').textContent        = data.pricing_tiers?.recommended?.price
    ? formatCurrency(data.pricing_tiers.recommended.price) : '—';

  const tiers    = data.pricing_tiers || {};
  const tiersBox = document.getElementById('anzPricingTiers');
  tiersBox.innerHTML = [
    { key: 'min',         label: 'Preço mínimo',    cls: '' },
    { key: 'recommended', label: 'Recomendado',     cls: 'pricing-tier--recommended' },
    { key: 'premium',     label: 'Preço premium',   cls: '' },
  ].map(({ key, label, cls }) => {
    const t = tiers[key];
    if (!t) return '';
    return `
      <div class="pricing-tier ${cls}">
        <span class="pricing-tier__label">${label}</span>
        <strong class="pricing-tier__value">${formatCurrency(t.price)}</strong>
        <p class="pricing-tier__description">${t.explanation || ''}</p>
      </div>
    `;
  }).join('');

  const se = data.sales_estimate || {};
  document.getElementById('anzSalesEstimate').innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${se.min || 0}–${se.max || 0} un./mês</span>
      <span class="tag tag--ok">${formatCurrency(se.revenue_min || 0)} – ${formatCurrency(se.revenue_max || 0)}/mês</span>
    </div>
  `;

  document.getElementById('anzAnxieties').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${(data.buyer_anxieties || []).map(a => `<li>${a}</li>`).join('')}
    </ul>
  `;

  document.getElementById('anzInsights').innerHTML = (data.insights || []).map(i => `
    <div class="result-block__field"><p>${i}</p></div>
  `).join('');
}
