/*
  analyzer.js — versão com backend real
  Substitui o arquivo js/analyzer.js existente no GitHub.
*/

function initAnalyzer() {
  const form = document.getElementById('analyzerForm');
  const loading = document.getElementById('analyzerLoading');
  const result = document.getElementById('analyzerResult');
  const fullAnalysis = document.getElementById('analyzerFullAnalysis');
  const submitBtn = document.getElementById('analyzerSubmit');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const link = document.getElementById('analyzerInput').value.trim();
    if (!link) return;

    result.classList.add('is-hidden');
    fullAnalysis.classList.add('is-hidden');
    loading.classList.remove('is-hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analisando…';

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

      renderAnalyzerFromAPI(data);

      loading.classList.add('is-hidden');
      fullAnalysis.classList.remove('is-hidden');

    } catch (error) {
      loading.classList.add('is-hidden');
      alert(error.message || 'Erro inesperado. Tente novamente.');
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analisar';
    }
  });

  document.getElementById('applySuggestion').addEventListener('click', () => {
    alert('Em produção: isso enviaria a sugestão para atualizar o anúncio no Mercado Livre.');
  });
}

function renderAnalyzerFromAPI(data) {
  // Veredito
  const verdictBox = document.getElementById('anzVerdict');
  const verdictColors = { 'OPORTUNIDADE': 'tag--ok', 'COMPETITIVO': 'tag--warn', 'SATURADO': 'tag--danger' };
  const verdictCls = verdictColors[data.verdict] || 'tag--warn';
  verdictBox.innerHTML = `
    <div class="result-block__field">
      <span class="tag ${verdictCls}" style="font-size:0.9rem;padding:6px 14px;">${data.verdict || '—'}</span>
    </div>
    <div class="result-block__field">
      <span>Por quê</span>
      <p>${data.verdict_explanation || ''}</p>
    </div>
  `;

  // KPIs
  document.getElementById('anzMarketPotential').textContent = data.market_potential?.label || '—';
  document.getElementById('anzCompetitiveness').textContent = data.competitiveness?.label || '—';
  document.getElementById('anzConversion').textContent = '—';
  document.getElementById('anzAvgPrice').textContent = data.pricing_tiers?.recommended?.price
    ? formatCurrency(data.pricing_tiers.recommended.price) : '—';

  // Faixas de preço
  const tiersBox = document.getElementById('anzPricingTiers');
  const tiers = data.pricing_tiers || {};
  tiersBox.innerHTML = [
    { key: 'min', label: 'Preço mínimo', cls: '' },
    { key: 'recommended', label: 'Preço recomendado', cls: 'pricing-tier--recommended' },
    { key: 'premium', label: 'Preço premium', cls: '' },
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

  // Estimativa de vendas
  const se = data.sales_estimate || {};
  document.getElementById('anzSalesEstimate').innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${se.min || 0}–${se.max || 0} un./mês</span>
      <span class="tag tag--ok">${formatCurrency(se.revenue_min || 0)} – ${formatCurrency(se.revenue_max || 0)}/mês</span>
    </div>
  `;

  // Ansiedades
  const anxieties = data.buyer_anxieties || [];
  document.getElementById('anzAnxieties').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${anxieties.map(a => `<li>${a}</li>`).join('')}
    </ul>
  `;

  // Insights
  const insights = data.insights || [];
  document.getElementById('anzInsights').innerHTML = insights.map(i => `
    <div class="result-block__field"><p>${i}</p></div>
  `).join('');
}
