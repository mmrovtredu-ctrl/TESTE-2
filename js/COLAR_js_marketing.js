/*
  marketing.js — versão com backend real
  Substitui o arquivo js/marketing.js existente no GitHub.
*/

function initMarketing() {
  const form = document.getElementById('marketingForm');
  const loading = document.getElementById('marketingLoading');
  const result = document.getElementById('marketingResult');
  const submitBtn = document.getElementById('marketingSubmit');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const link = document.getElementById('marketingInput').value.trim();
    if (!link) return;

    result.classList.add('is-hidden');
    loading.classList.remove('is-hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gerando…';

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

      renderMarketingFromAPI(data);

      loading.classList.add('is-hidden');
      result.classList.remove('is-hidden');

    } catch (error) {
      loading.classList.add('is-hidden');
      alert(error.message || 'Erro inesperado. Tente novamente.');
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gerar pacote';
    }
  });
}

function renderMarketingFromAPI(data) {
  const se = data.sales_estimate || {};
  const anxieties = data.buyer_anxieties || [];
  const benefits = data.key_benefits || [];
  const keywords = data.keywords || [];
  const faq = data.faq || [];

  // Análise de mercado
  document.getElementById('mktMarketAnalysis').innerHTML = `
    <div class="result-block__field">
      <span>Resumo</span>
      <p>${data.market_analysis || ''}</p>
    </div>
  `;

  // Título otimizado
  document.getElementById('mktTitle').innerHTML = `
    <div class="result-block__field">
      <span>Título recomendado</span>
      <p>${data.optimized_title || ''}</p>
    </div>
  `;

  // Estratégia de preço
  document.getElementById('mktPricing').innerHTML = `
    <div class="result-block__field">
      <p>${data.price_strategy || ''}</p>
    </div>
  `;

  // Estimativa de vendas
  document.getElementById('mktSalesEstimate').innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${se.min || 0}–${se.max || 0} un./mês</span>
      <span class="tag tag--ok">${formatCurrency(se.revenue_min || 0)} – ${formatCurrency(se.revenue_max || 0)}/mês</span>
    </div>
  `;

  // Melhor época
  document.getElementById('mktBestSeason').innerHTML = `
    <div class="result-block__field">
      <p>${data.best_season || ''}</p>
    </div>
  `;

  // Ansiedades
  document.getElementById('mktAnxieties').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${anxieties.map(a => `<li>${a}</li>`).join('')}
    </ul>
  `;

  // Benefícios
  document.getElementById('mktBenefits').innerHTML = `
    <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px;">
      ${benefits.map(b => `<li>${b}</li>`).join('')}
    </ul>
  `;

  // Keywords
  document.getElementById('mktKeywords').innerHTML = `
    <div class="result-block__tags">
      ${keywords.map(k => `<span class="tag tag--ok">${k}</span>`).join('')}
    </div>
  `;

  // Anúncio completo
  const adText = data.ad_copy || '';
  document.getElementById('mktFullAd').innerHTML = `
    <div class="result-block__field">
      <p style="white-space:pre-line;">${adText}</p>
    </div>
  `;

  // Botão copiar
  const copyBtn = document.getElementById('copyFullAd');
  copyBtn.onclick = () => copyToClipboard(adText, copyBtn);

  // FAQ
  document.getElementById('mktFaq').innerHTML = faq.map(f => `
    <div class="result-block__field">
      <span>${f.question}</span>
      <p>${f.answer}</p>
    </div>
  `).join('');
}

function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const original = button.textContent;
    button.textContent = 'Copiado!';
    setTimeout(() => { button.textContent = original; }, 2000);
  }).catch(() => {
    alert('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
  });
}
