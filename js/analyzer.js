/*
  analyzer.js
  -----------
  Preenche a view "Analisar produto":
  - Formulário onde o usuário cola um link ou nome de produto
  - Estado de carregamento enquanto o agente "processa"
  - Exibição do anúncio atual vs sugestão otimizada
  - ANÁLISE COMPLETA: veredito, potencial de mercado,
    competitividade, estratégia de preço (3 níveis), estimativa
    de vendas/faturamento baseada nos concorrentes, ansiedades
    do comprador e outros insights.

  INTEGRAÇÃO REAL:
  No lugar de simulateAnalysis(), você vai chamar seu backend, que:
  1. Faz scraping do link do ML (título, descrição, imagens, tags, preço)
  2. Busca os concorrentes da mesma categoria (top 5)
  3. Busca o nome do produto no Google Custom Search
  4. Envia tudo para a API da Anthropic com um prompt estruturado
  5. Retorna um JSON combinando MOCK_ANALYZER_RESULT + MOCK_PRODUCT_ANALYSIS
*/

/**
 * Renderiza o bloco do anúncio atual.
 * @param {object} original - MOCK_ANALYZER_RESULT.original
 */
function renderAnalyzerOriginal(original) {
  const box = document.getElementById("analyzerOriginal");
  box.innerHTML = `
    <div class="result-block__field">
      <span>Título</span>
      <p>${original.title}</p>
    </div>
    <div class="result-block__field">
      <span>Descrição</span>
      <p>${original.description}</p>
    </div>
    <div class="result-block__field">
      <span>Tags</span>
      <div class="result-block__tags">
        ${original.tags.map((t) => `<span class="tag tag--warn">${t}</span>`).join("")}
      </div>
    </div>
    <div class="result-block__field">
      <span>Imagens</span>
      <p>${original.images} imagem(ns) cadastrada(s)</p>
    </div>
  `;
}

/**
 * Renderiza o bloco da sugestão otimizada.
 * @param {object} suggestion - MOCK_ANALYZER_RESULT.suggestion
 */
function renderAnalyzerSuggestion(suggestion) {
  const box = document.getElementById("analyzerSuggestion");
  box.innerHTML = `
    <div class="result-block__field">
      <span>Título sugerido</span>
      <p>${suggestion.title}</p>
    </div>
    <div class="result-block__field">
      <span>Descrição sugerida</span>
      <p>${suggestion.description}</p>
    </div>
    <div class="result-block__field">
      <span>Tags sugeridas</span>
      <div class="result-block__tags">
        ${suggestion.tags.map((t) => `<span class="tag tag--ok">${t}</span>`).join("")}
      </div>
    </div>
    <div class="result-block__field">
      <span>Pontos de melhoria</span>
      <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:6px;">
        ${suggestion.improvementPoints.map((p) => `<li>${p}</li>`).join("")}
      </ul>
    </div>
  `;
}

/**
 * Retorna a tag colorida para o veredito ("vale a pena vender?").
 * @param {string} verdict
 * @returns {string}
 */
function verdictTag(verdict) {
  let cls = "tag--warn";
  if (verdict === "Vale a pena vender") cls = "tag--ok";
  if (verdict === "Não recomendado") cls = "tag--danger";
  return `<span class="tag ${cls}" style="font-size:0.9rem; padding:6px 14px;">${verdict}</span>`;
}

/**
 * Renderiza o veredito geral (vale a pena vender ou não).
 * @param {object} overview - MOCK_PRODUCT_ANALYSIS.overview
 */
function renderVerdict(overview) {
  const box = document.getElementById("anzVerdict");
  box.innerHTML = `
    <div class="result-block__field">
      ${verdictTag(overview.verdict)}
    </div>
    <div class="result-block__field">
      <span>Por quê</span>
      <p>${overview.verdictReasoning}</p>
    </div>
  `;
}

/**
 * Renderiza os 4 KPIs de potencial/competitividade/conversão/preço médio.
 * @param {object} overview - MOCK_PRODUCT_ANALYSIS.overview
 * @param {object} competitorPricing - MOCK_PRODUCT_ANALYSIS.competitorPricing
 */
function renderAnalysisKpis(overview, competitorPricing) {
  document.getElementById("anzMarketPotential").textContent = overview.marketPotential;
  document.getElementById("anzCompetitiveness").textContent = overview.competitiveness;
  document.getElementById("anzConversion").textContent = overview.conversionPotential;
  document.getElementById("anzAvgPrice").textContent = formatCurrency(competitorPricing.average);
}

/**
 * Renderiza os 3 cards de estratégia de preço (mínimo/recomendado/premium).
 * @param {object} pricingStrategy - MOCK_PRODUCT_ANALYSIS.pricingStrategy
 */
function renderPricingTiers(pricingStrategy) {
  const box = document.getElementById("anzPricingTiers");
  const tiers = [
    { key: "minPrice", extraClass: "" },
    { key: "recommendedPrice", extraClass: "pricing-tier--recommended" },
    { key: "premiumPrice", extraClass: "" },
  ];

  box.innerHTML = tiers
    .map(({ key, extraClass }) => {
      const tier = pricingStrategy[key];
      return `
        <div class="pricing-tier ${extraClass}">
          <span class="pricing-tier__label">${tier.label}</span>
          <strong class="pricing-tier__value">${formatCurrency(tier.value)}</strong>
          <p class="pricing-tier__description">${tier.description}</p>
        </div>
      `;
    })
    .join("");
}

/**
 * Renderiza a estimativa de vendas e faturamento.
 * @param {object} salesEstimate - MOCK_PRODUCT_ANALYSIS.salesEstimate
 */
function renderAnalysisSalesEstimate(salesEstimate) {
  const box = document.getElementById("anzSalesEstimate");
  box.innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${salesEstimate.estimatedMonthlySales} un./mês estimadas</span>
      <span class="tag tag--ok">${formatCurrency(salesEstimate.estimatedMonthlyRevenue)}/mês estimado</span>
      <span class="tag tag--warn">Concorrentes vendem em média ${salesEstimate.competitorAvgSales30d} un./mês</span>
    </div>
    <div class="result-block__field">
      <span>Como chegamos nesse número</span>
      <p>${salesEstimate.reasoning}</p>
    </div>
  `;
}

/**
 * Renderiza a lista de ansiedades do comprador.
 * @param {string[]} items - MOCK_PRODUCT_ANALYSIS.buyerAnxieties
 */
function renderAnalysisAnxieties(items) {
  const box = document.getElementById("anzAnxieties");
  box.innerHTML = `
    <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:8px;">
      ${items.map((i) => `<li>${i}</li>`).join("")}
    </ul>
  `;
}

/**
 * Renderiza os insights adicionais (sazonalidade, diferenciais, riscos, oportunidades).
 * @param {object[]} insights - MOCK_PRODUCT_ANALYSIS.additionalInsights
 */
function renderAnalysisInsights(insights) {
  const box = document.getElementById("anzInsights");
  box.innerHTML = insights
    .map(
      (item) => `
      <div class="result-block__field">
        <span>${item.title}</span>
        <p>${item.detail}</p>
      </div>
    `
    )
    .join("");
}

/**
 * Renderiza todos os blocos da análise completa.
 * @param {object} analysis - MOCK_PRODUCT_ANALYSIS
 */
function renderFullAnalysis(analysis) {
  renderVerdict(analysis.overview);
  renderAnalysisKpis(analysis.overview, analysis.competitorPricing);
  renderPricingTiers(analysis.pricingStrategy);
  renderAnalysisSalesEstimate(analysis.salesEstimate);
  renderAnalysisAnxieties(analysis.buyerAnxieties);
  renderAnalysisInsights(analysis.additionalInsights);
}

/**
 * Simula a chamada ao agente de IA (substitua por fetch real).
 * Retorna tanto o resultado do anúncio (original/sugestão) quanto
 * a análise completa do produto.
 * @returns {Promise<{ad: object, analysis: object}>}
 */
function simulateAnalysis() {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          ad: MOCK_ANALYZER_RESULT,
          analysis: MOCK_PRODUCT_ANALYSIS,
        }),
      1400
    );
  });
}

/**
 * Inicializa o formulário de análise de produto.
 */
function initAnalyzer() {
  const form = document.getElementById("analyzerForm");
  const loading = document.getElementById("analyzerLoading");
  const result = document.getElementById("analyzerResult");
  const fullAnalysis = document.getElementById("analyzerFullAnalysis");
  const submitBtn = document.getElementById("analyzerSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("analyzerInput").value.trim();
    if (!input) return;

    // Mostra estado de carregamento
    result.classList.add("is-hidden");
    fullAnalysis.classList.add("is-hidden");
    loading.classList.remove("is-hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Analisando…";

    try {
      // ----- SUBSTITUIR pela chamada real ao backend -----
      const data = await simulateAnalysis();
      // -----------------------------------------------------

      renderAnalyzerOriginal(data.ad.original);
      renderAnalyzerSuggestion(data.ad.suggestion);
      renderFullAnalysis(data.analysis);

      loading.classList.add("is-hidden");
      result.classList.remove("is-hidden");
      fullAnalysis.classList.remove("is-hidden");
    } catch (err) {
      loading.classList.add("is-hidden");
      alert("Erro ao analisar o produto. Tente novamente.");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Analisar";
    }
  });

  // Botão "Usar esta sugestão" — em produção, chamaria a API do ML
  // para atualizar o anúncio (PUT /items/{id})
  document.getElementById("applySuggestion").addEventListener("click", () => {
    alert("Em produção: isso enviaria a sugestão para atualizar o anúncio no Mercado Livre.");
  });
}
