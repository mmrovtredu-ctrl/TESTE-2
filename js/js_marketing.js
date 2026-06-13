// js/marketing.js — versão com backend real (substitui simulateMarketingAnalysis)

function initMarketing() {
  const form = document.getElementById('marketing-form');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const link = document.getElementById('marketing-link')?.value?.trim();
    if (!link) return;

    showMarketingLoading(true);
    clearMarketingResult();

    try {
      const response = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar pacote de marketing.');
      }

      renderMarketingResult(data);

    } catch (error) {
      showMarketingError(error.message || 'Erro inesperado. Tente novamente.');
    } finally {
      showMarketingLoading(false);
    }
  });
}

function showMarketingLoading(show) {
  const btn = document.getElementById('marketing-submit-btn');
  const loading = document.getElementById('marketing-loading');
  if (btn) btn.disabled = show;
  if (loading) loading.style.display = show ? 'flex' : 'none';
}

function clearMarketingResult() {
  const container = document.getElementById('marketing-result');
  if (container) container.innerHTML = '';
}

function showMarketingError(message) {
  const container = document.getElementById('marketing-result');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert--error">
      <span class="alert__icon">⚠️</span>
      <span>${message}</span>
    </div>
  `;
}

function renderMarketingResult(data) {
  const container = document.getElementById('marketing-result');
  if (!container) return;

  const salesEstimate = data.sales_estimate || {};
  const anxieties = data.buyer_anxieties || [];
  const benefits = data.key_benefits || [];
  const keywords = data.keywords || [];
  const faq = data.faq || [];

  container.innerHTML = `
    <div class="marketing-result">

      <!-- Análise de mercado -->
      <div class="panel panel--highlight">
        <div class="panel__label">Análise de mercado</div>
        <p class="panel__desc">${data.market_analysis || ''}</p>
      </div>

      <!-- Título otimizado -->
      <div class="panel">
        <div class="panel__label">Título otimizado para o ML</div>
        <div class="copyable-block">
          <p class="copyable-text">${data.optimized_title || ''}</p>
          <button class="btn btn--ghost btn--sm" onclick="copyToClipboard('${escapeForAttr(data.optimized_title)}', this)">Copiar</button>
        </div>
      </div>

      <!-- Estratégia de preço + Estimativa -->
      <div class="grid grid--2col">
        <div class="panel">
          <div class="panel__label">Estratégia de preço</div>
          <p class="panel__desc">${data.price_strategy || ''}</p>
        </div>
        <div class="panel">
          <div class="panel__label">Estimativa mensal</div>
          <div class="kpi-value">${salesEstimate.min ?? '—'}–${salesEstimate.max ?? '—'}<span class="kpi-unit"> un</span></div>
          <div class="kpi-sub">${formatCurrency(salesEstimate.revenue_min)} – ${formatCurrency(salesEstimate.revenue_max)}</div>
        </div>
      </div>

      <!-- Melhor época -->
      <div class="panel">
        <div class="panel__label">📅 Melhor época para vender</div>
        <p class="panel__desc">${data.best_season || ''}</p>
      </div>

      <!-- Ansiedades e Benefícios -->
      <div class="grid grid--2col">
        ${anxieties.length ? `
        <div class="panel">
          <div class="panel__label">Ansiedades do comprador</div>
          <ul class="insight-list">
            ${anxieties.map(a => `<li>😰 ${a}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${benefits.length ? `
        <div class="panel">
          <div class="panel__label">Benefícios principais</div>
          <ul class="insight-list">
            ${benefits.map(b => `<li>✅ ${b}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>

      <!-- Keywords -->
      ${keywords.length ? `
      <div class="panel">
        <div class="panel__label">Palavras-chave (SEO)</div>
        <div class="tags-row">
          ${keywords.map(k => `<span class="tag tag--default">${k}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Anúncio completo -->
      ${data.ad_copy ? `
      <div class="panel">
        <div class="panel__label">📝 Anúncio completo — pronto para copiar</div>
        <div class="copyable-block copyable-block--large">
          <pre class="copyable-text">${data.ad_copy}</pre>
          <button class="btn btn--ghost btn--sm" onclick="copyToClipboard('${escapeForAttr(data.ad_copy)}', this)">Copiar tudo</button>
        </div>
      </div>` : ''}

      <!-- FAQ -->
      ${faq.length ? `
      <div class="panel">
        <div class="panel__label">❓ Perguntas frequentes</div>
        <div class="faq-list">
          ${faq.map(f => `
            <div class="faq-item">
              <div class="faq-question">${f.question}</div>
              <div class="faq-answer">${f.answer}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

    </div>
  `;
}

function escapeForAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text.replace(/\\n/g, '\n')).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
}
