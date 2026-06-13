// js/analyzer.js — versão com backend real (substitui simulateAnalysis)

function initAnalyzer() {
  const form = document.getElementById('analyzer-form');
  const resultContainer = document.getElementById('analyzer-result');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const link = document.getElementById('analyzer-link')?.value?.trim();
    if (!link) return;

    showAnalyzerLoading(true);
    clearAnalyzerResult();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar produto.');
      }

      renderAnalyzerResult(data);

    } catch (error) {
      showAnalyzerError(error.message || 'Erro inesperado. Tente novamente.');
    } finally {
      showAnalyzerLoading(false);
    }
  });
}

function showAnalyzerLoading(show) {
  const btn = document.getElementById('analyzer-submit-btn');
  const loading = document.getElementById('analyzer-loading');
  if (btn) btn.disabled = show;
  if (loading) loading.style.display = show ? 'flex' : 'none';
}

function clearAnalyzerResult() {
  const container = document.getElementById('analyzer-result');
  if (container) container.innerHTML = '';
}

function showAnalyzerError(message) {
  const container = document.getElementById('analyzer-result');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert--error">
      <span class="alert__icon">⚠️</span>
      <span>${message}</span>
    </div>
  `;
}

function renderAnalyzerResult(data) {
  const container = document.getElementById('analyzer-result');
  if (!container) return;

  const verdictClass = {
    'OPORTUNIDADE': 'tag--success',
    'COMPETITIVO': 'tag--warning',
    'SATURADO': 'tag--danger',
  }[data.verdict] || 'tag--default';

  const pricingTiers = data.pricing_tiers || {};
  const salesEstimate = data.sales_estimate || {};
  const anxieties = data.buyer_anxieties || [];
  const insights = data.insights || [];

  container.innerHTML = `
    <div class="analyzer-result">

      <!-- Veredito -->
      <div class="panel panel--highlight">
        <div class="panel__header">
          <span class="tag ${verdictClass}">${data.verdict}</span>
          <h3 class="panel__title">Veredito do produto</h3>
        </div>
        <p class="panel__desc">${data.verdict_explanation || ''}</p>
      </div>

      <!-- Potencial e Competitividade -->
      <div class="grid grid--2col">
        <div class="panel">
          <div class="panel__label">Potencial de mercado</div>
          <div class="kpi-value">${data.market_potential?.score ?? '—'}<span class="kpi-unit">/100</span></div>
          <div class="tag ${getScoreTag(data.market_potential?.label)}">${data.market_potential?.label || ''}</div>
          <p class="panel__desc">${data.market_potential?.explanation || ''}</p>
        </div>
        <div class="panel">
          <div class="panel__label">Competitividade</div>
          <div class="kpi-value">${data.competitiveness?.score ?? '—'}<span class="kpi-unit">/100</span></div>
          <div class="tag ${getScoreTag(data.competitiveness?.label)}">${data.competitiveness?.label || ''}</div>
          <p class="panel__desc">${data.competitiveness?.explanation || ''}</p>
        </div>
      </div>

      <!-- Faixas de preço -->
      <div class="panel">
        <div class="panel__label">Faixas de preço recomendadas</div>
        <div class="pricing-tiers">
          ${renderPricingTier('Entrada', pricingTiers.min)}
          ${renderPricingTier('Recomendado', pricingTiers.recommended, true)}
          ${renderPricingTier('Premium', pricingTiers.premium)}
        </div>
      </div>

      <!-- Estimativa de vendas -->
      <div class="panel">
        <div class="panel__label">Estimativa mensal</div>
        <div class="grid grid--2col">
          <div>
            <div class="kpi-label">Vendas</div>
            <div class="kpi-value">${salesEstimate.min ?? '—'}–${salesEstimate.max ?? '—'}<span class="kpi-unit"> un</span></div>
          </div>
          <div>
            <div class="kpi-label">Faturamento</div>
            <div class="kpi-value">${formatCurrency(salesEstimate.revenue_min)}–${formatCurrency(salesEstimate.revenue_max)}</div>
          </div>
        </div>
      </div>

      <!-- Ansiedades do comprador -->
      ${anxieties.length ? `
      <div class="panel">
        <div class="panel__label">Ansiedades do comprador</div>
        <ul class="insight-list">
          ${anxieties.map(a => `<li>😰 ${a}</li>`).join('')}
        </ul>
      </div>` : ''}

      <!-- Insights adicionais -->
      ${insights.length ? `
      <div class="panel">
        <div class="panel__label">Insights adicionais</div>
        <ul class="insight-list">
          ${insights.map(i => `<li>💡 ${i}</li>`).join('')}
        </ul>
      </div>` : ''}

    </div>
  `;
}

function renderPricingTier(label, tier, highlighted = false) {
  if (!tier) return '';
  return `
    <div class="pricing-tier ${highlighted ? 'pricing-tier--highlighted' : ''}">
      <div class="pricing-tier__label">${label}</div>
      <div class="pricing-tier__price">${formatCurrency(tier.price)}</div>
      <div class="pricing-tier__desc">${tier.explanation || ''}</div>
    </div>
  `;
}

function getScoreTag(label) {
  const map = { 'Alto': 'tag--success', 'Alta': 'tag--success', 'Médio': 'tag--warning', 'Média': 'tag--warning', 'Baixo': 'tag--danger', 'Baixa': 'tag--danger' };
  return map[label] || 'tag--default';
}
