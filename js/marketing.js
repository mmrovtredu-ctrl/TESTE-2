/*
  js/marketing.js — com busca real no ML + FICHA DE PUBLICAÇÃO
  Igual ao analyzer: aceita texto livre, busca no ML,
  usuário seleciona o produto, gera o pacote de marketing.

  NOVO: ao final do resultado, monta uma "Ficha para publicar no
  Mercado Livre" — junta o que a IA já gerou (título, preço,
  descrição, palavras-chave) com os campos que faltavam (categoria,
  condição, estoque, tipo de anúncio, marca/modelo, código de barras,
  envio, garantia, fotos). Tudo editável, com botão de copiar.
*/

function initMarketing() {
  const form      = document.getElementById('marketingForm');
  const input     = document.getElementById('marketingInput');
  const loading   = document.getElementById('marketingLoading');
  const result    = document.getElementById('marketingResult');
  const submitBtn = document.getElementById('marketingSubmit');

  if (!form) return;

  let searchResultsBox = null;

  function getOrCreateSearchBox() {
    if (!searchResultsBox) {
      searchResultsBox = document.createElement('div');
      searchResultsBox.id        = 'marketingSearchResults';
      searchResultsBox.className = 'panel is-hidden';
      searchResultsBox.innerHTML = `
        <div class="panel__header">
          <h2>Selecione o produto para gerar o pacote</h2>
          <span class="panel__hint" id="mktSearchCount">—</span>
        </div>
        <div id="mktSearchGrid" style="display:flex;flex-direction:column;gap:8px;"></div>
      `;
      form.parentNode.insertBefore(searchResultsBox, form.nextSibling);
    }
    return searchResultsBox;
  }

  function isMLLink(text) {
    return text.includes('mercadolivre.com') || text.includes('mercadolibre.com') || /^MLB\d+$/i.test(text.trim());
  }

  async function searchML(query) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Buscando…';
    result.classList.add('is-hidden');

    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na busca.');
      renderSearchResults(data.items, data.total);
    } catch (err) {
      alert(err.message || 'Erro ao buscar no Mercado Livre.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Gerar pacote';
    }
  }

  function renderSearchResults(items, total) {
    const box   = getOrCreateSearchBox();
    const grid  = document.getElementById('mktSearchGrid');
    const count = document.getElementById('mktSearchCount');

    count.textContent = `${total.toLocaleString('pt-BR')} resultados — mostrando ${items.length}`;
    grid.innerHTML    = '';

    if (items.length === 0) {
      grid.innerHTML = `<p class="form-hint">Nenhum resultado. Tente outra busca.</p>`;
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

      card.innerHTML = `
        ${imgHtml}
        <div style="flex:1;min-width:0;">
          <p style="font-size:0.85rem;font-weight:600;margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</p>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:700;">${formatCurrency(item.price)}</span>
            <span style="font-size:0.75rem;color:var(--color-text-muted);">${item.sold_quantity} vendidos</span>
            <span style="font-size:0.75rem;color:var(--color-text-muted);">${item.seller}</span>
          </div>
        </div>
        <span style="font-size:0.75rem;color:var(--color-accent);font-weight:600;flex-shrink:0;">Gerar pacote →</span>
      `;

      card.addEventListener('click', () => {
        input.value = item.permalink || item.ml_link;
        box.classList.add('is-hidden');
        runMarketing(item.permalink || item.ml_link);
      });

      grid.appendChild(card);
    });

    box.classList.remove('is-hidden');
  }

  async function runMarketing(link) {
    result.classList.add('is-hidden');
    loading.classList.remove('is-hidden');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Gerando…';

    const box = document.getElementById('marketingSearchResults');
    if (box) box.classList.add('is-hidden');

    try {
      const response = await fetch('/api/marketing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ link }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar pacote de marketing.');

      renderMarketingFromAPI(data);
      loading.classList.add('is-hidden');
      result.classList.remove('is-hidden');

    } catch (error) {
      loading.classList.add('is-hidden');
      alert(error.message || 'Erro inesperado. Tente novamente.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Gerar pacote';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    if (isMLLink(value)) {
      await runMarketing(value);
    } else {
      await searchML(value);
    }
  });

  let debounceTimer;
  input.addEventListener('input', () => {
    const value = input.value.trim();
    clearTimeout(debounceTimer);
    const box = document.getElementById('marketingSearchResults');
    if (box && (value.length < 2 || isMLLink(value))) { box.classList.add('is-hidden'); return; }
    if (value.length >= 2 && !isMLLink(value)) {
      debounceTimer = setTimeout(() => searchML(value), 600);
    }
  });
}

function renderMarketingFromAPI(data) {
  const se        = data.sales_estimate || {};
  const anxieties = data.buyer_anxieties || [];
  const benefits  = data.key_benefits   || [];
  const keywords  = data.keywords       || [];
  const faq       = data.faq            || [];

  document.getElementById('mktMarketAnalysis').innerHTML = `
    <div class="result-block__field"><span>Resumo</span><p>${data.market_analysis || ''}</p></div>
  `;
  document.getElementById('mktTitle').innerHTML = `
    <div class="result-block__field"><span>Título recomendado</span><p>${data.optimized_title || ''}</p></div>
  `;
  document.getElementById('mktPricing').innerHTML = `
    <div class="result-block__field"><p>${data.price_strategy || ''}</p></div>
  `;
  document.getElementById('mktSalesEstimate').innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${se.min || 0}–${se.max || 0} un./mês</span>
      <span class="tag tag--ok">${formatCurrency(se.revenue_min || 0)} – ${formatCurrency(se.revenue_max || 0)}/mês</span>
    </div>
  `;
  document.getElementById('mktBestSeason').innerHTML = `
    <div class="result-block__field"><p>${data.best_season || ''}</p></div>
  `;
  document.getElementById('mktAnxieties').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${anxieties.map(a => `<li>${a}</li>`).join('')}
    </ul>
  `;
  document.getElementById('mktBenefits').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${benefits.map(b => `<li>${b}</li>`).join('')}
    </ul>
  `;
  document.getElementById('mktKeywords').innerHTML = `
    <div class="result-block__tags">
      ${keywords.map(k => `<span class="tag tag--ok">${k}</span>`).join('')}
    </div>
  `;

  const adText = data.ad_copy || '';
  document.getElementById('mktFullAd').innerHTML = `
    <div class="result-block__field"><p style="white-space:pre-line;">${adText}</p></div>
  `;

  const copyBtn = document.getElementById('copyFullAd');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(adText).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => { copyBtn.textContent = orig; }, 2000);
      }).catch(() => alert('Selecione o texto manualmente para copiar.'));
    };
  }

  document.getElementById('mktFaq').innerHTML = faq.map(f => `
    <div class="result-block__field"><span>${f.question}</span><p>${f.answer}</p></div>
  `).join('');

  // NOVO: ficha completa para publicar o anúncio
  renderMarketingLaunchSheet(data);
}

/* ============================================================
   FICHA PARA PUBLICAR NO MERCADO LIVRE
   Junta o que a IA gerou + os campos que faltavam, em um único
   bloco organizado e editável, com botão de copiar tudo.
   ============================================================ */

// Escapa aspas/sinais para usar com segurança dentro de value="" e placeholder=""
function mlsEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarketingLaunchSheet(data) {
  const resultBox = document.getElementById('marketingResult');
  if (!resultBox) return;

  // Evita duplicar a ficha se gerar de novo
  const old = document.getElementById('mktLaunchSheet');
  if (old) old.remove();

  const ld        = data.listing_data || {};
  const attrs     = Array.isArray(ld.suggested_attributes) ? ld.suggested_attributes : [];
  const price     = (data.recommended_price != null && data.recommended_price !== 0)
    ? data.recommended_price : '';
  const title     = data.optimized_title || '';
  const desc      = data.ad_copy || '';

  const sectionLabel = (txt) =>
    `<span style="display:block;font-family:var(--font-mono);font-size:0.72rem;text-transform:uppercase;
      letter-spacing:0.06em;color:var(--color-accent);font-weight:600;margin:14px 0 4px;">${txt}</span>`;

  const gridOpen  = `<div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">`;
  const gridClose = `</div>`;

  // Campos de atributos dinâmicos (Marca, Modelo, Cor...)
  const attrFields = attrs.map((a, i) => `
    <label class="field">
      <span>${mlsEsc(a.name || ('Atributo ' + (i + 1)))}</span>
      <input class="input" id="mlsAttr_${i}" data-attr-name="${mlsEsc(a.name || '')}"
             placeholder="${mlsEsc(a.example || '')}" />
    </label>`).join('');

  const panel = document.createElement('div');
  panel.className = 'panel panel--accent';
  panel.id = 'mktLaunchSheet';
  panel.innerHTML = `
    <div class="panel__header">
      <h2>✅ Ficha para publicar no Mercado Livre</h2>
      <span class="panel__hint">Preencha na hora de criar o anúncio</span>
    </div>

    <div class="result-block">

      ${sectionLabel('1 · Título e identificação')}
      <div class="form-grid">
        <label class="field">
          <span>Título (máx. 60) — <em id="mlsTitleCount" style="font-style:normal;color:var(--color-text-faint);">0/60</em></span>
          <input class="input" id="mlsTitle" maxlength="60" value="${mlsEsc(title)}" />
        </label>
      </div>
      ${gridOpen}
        <label class="field">
          <span>Categoria sugerida</span>
          <input class="input" id="mlsCategory" value="${mlsEsc(ld.suggested_category || '')}" />
        </label>
        <label class="field">
          <span>Condição</span>
          <select class="select" id="mlsCondition">
            <option ${ld.recommended_condition === 'Usado' ? '' : 'selected'}>Novo</option>
            <option ${ld.recommended_condition === 'Usado' ? 'selected' : ''}>Usado</option>
          </select>
        </label>
        <label class="field">
          <span>SKU (seu código interno)</span>
          <input class="input" id="mlsSku" placeholder="opcional" />
        </label>
        <label class="field">
          <span>Código de barras (GTIN/EAN)</span>
          <input class="input" id="mlsGtin" placeholder="se a categoria exigir" />
        </label>
      ${gridClose}
      <p class="form-hint">A categoria acima é uma estimativa — confirme a categoria exata no Mercado Livre (ele sugere pelo título).</p>

      ${sectionLabel('2 · Preço, estoque e tipo de anúncio')}
      ${gridOpen}
        <label class="field">
          <span>Preço de venda (R$)</span>
          <input class="input" id="mlsPrice" type="number" step="0.01" min="0" value="${mlsEsc(price)}" />
        </label>
        <label class="field">
          <span>Estoque (unidades)</span>
          <input class="input" id="mlsStock" type="number" min="0" placeholder="quantas você tem" />
        </label>
        <label class="field">
          <span>Tipo de anúncio</span>
          <select class="select" id="mlsListingType">
            <option ${ld.recommended_listing_type === 'Premium' ? '' : 'selected'}>Clássico</option>
            <option ${ld.recommended_listing_type === 'Premium' ? 'selected' : ''}>Premium</option>
          </select>
        </label>
      ${gridClose}
      ${ld.listing_type_reason ? `<p class="form-hint">${ld.listing_type_reason}</p>` : ''}

      ${attrs.length ? sectionLabel('3 · Atributos da categoria (Ficha técnica)') : ''}
      ${attrs.length ? gridOpen + attrFields + gridClose : ''}

      ${sectionLabel('4 · Descrição do anúncio')}
      <label class="field">
        <span>Descrição (pronta para colar)</span>
        <textarea class="input" id="mlsDesc" rows="6" style="resize:vertical;line-height:1.5;">${mlsEsc(desc)}</textarea>
      </label>
      <button class="btn btn--ghost" id="mlsCopyDesc" style="align-self:flex-start;margin-top:6px;">Copiar descrição</button>

      <button class="btn btn--primary btn--block" id="mlsCopyAll">📋 Copiar ficha completa</button>
    </div>
  `;

  resultBox.appendChild(panel);

  // ── Listeners ──────────────────────────────────────────────
  const titleInput = document.getElementById('mlsTitle');
  const titleCount = document.getElementById('mlsTitleCount');
  const updateCount = () => { titleCount.textContent = `${titleInput.value.length}/60`; };
  titleInput.addEventListener('input', updateCount);
  updateCount();

  const copyFeedback = (btn, text) => {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => alert('Não consegui copiar automaticamente. Selecione e copie manualmente.'));
  };

  document.getElementById('mlsCopyDesc').addEventListener('click', (e) => {
    copyFeedback(e.target, document.getElementById('mlsDesc').value);
  });

  document.getElementById('mlsCopyAll').addEventListener('click', (e) => {
    copyFeedback(e.target, buildFichaText());
  });
}

// Monta o texto da ficha completa a partir dos campos atuais
function buildFichaText() {
  const val = (id) => (document.getElementById(id)?.value || '').trim();

  const lines = [];
  lines.push('=== FICHA PARA PUBLICAR NO MERCADO LIVRE ===', '');
  lines.push('• Título: ' + val('mlsTitle'));
  lines.push('• Categoria sugerida: ' + val('mlsCategory'));
  lines.push('• Condição: ' + val('mlsCondition'));
  if (val('mlsSku'))  lines.push('• SKU: ' + val('mlsSku'));
  if (val('mlsGtin')) lines.push('• Código de barras (GTIN/EAN): ' + val('mlsGtin'));
  lines.push('');
  lines.push('• Preço: R$ ' + val('mlsPrice'));
  lines.push('• Estoque: ' + val('mlsStock') + ' unidade(s)');
  lines.push('• Tipo de anúncio: ' + val('mlsListingType'));
  lines.push('');

  // Atributos da categoria
  const attrInputs = document.querySelectorAll('[id^="mlsAttr_"]');
  if (attrInputs.length) {
    lines.push('— Ficha técnica —');
    attrInputs.forEach((inp) => {
      const name = inp.getAttribute('data-attr-name') || 'Atributo';
      const v = (inp.value || '').trim();
      lines.push('• ' + name + ': ' + (v || '(preencher)'));
    });
    lines.push('');
  }

  lines.push('— Descrição —');
  lines.push(val('mlsDesc'));

  return lines.join('\n');
}
