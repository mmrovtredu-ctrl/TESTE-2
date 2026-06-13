/*
  marketing.js
  ------------
  Preenche a view "Marketing":
  - Formulário onde o usuário cola o link do produto
  - Estado de carregamento enquanto o agente "processa"
  - Renderiza o pacote completo: análise de mercado, título
    otimizado, estratégia de preço, estimativa de vendas, melhor
    época, ansiedades do comprador, benefícios, palavras-chave,
    anúncio completo (copiável) e perguntas frequentes.

  INTEGRAÇÃO REAL:
  No lugar de simulateMarketingAnalysis(), você vai chamar seu
  backend, que:
  1. Faz scraping do link (título, preço, descrição, categoria, imagens)
  2. Busca concorrentes da mesma categoria no Mercado Livre
  3. Busca tendências/sazonalidade e palavras-chave (Google)
  4. Envia tudo para a API da Anthropic com um prompt estruturado
  5. Retorna um JSON no mesmo formato de MOCK_MARKETING_RESULT
*/

/**
 * Renderiza o bloco de análise de mercado.
 * @param {object} data - MOCK_MARKETING_RESULT.marketAnalysis
 */
function renderMarketAnalysis(data) {
  const box = document.getElementById("mktMarketAnalysis");
  box.innerHTML = `
    <div class="result-block__field">
      <span>Resumo</span>
      <p>${data.summary}</p>
    </div>
    <div class="result-block__tags">
      <span class="tag tag--warn">Concorrência: ${data.competitionLevel}</span>
      <span class="tag tag--ok">Preço médio: ${formatCurrency(data.averagePrice)}</span>
      <span class="tag tag--ok">Menor preço: ${formatCurrency(data.topSellerPrice)}</span>
    </div>
    <div class="result-block__field">
      <span>Tendência de demanda</span>
      <p>${data.demandTrend}</p>
    </div>
  `;
}

/**
 * Renderiza o bloco de título otimizado.
 * @param {object} data - MOCK_MARKETING_RESULT.optimizedTitle
 */
function renderTitle(data) {
  const box = document.getElementById("mktTitle");
  box.innerHTML = `
    <div class="result-block__field">
      <span>Título recomendado</span>
      <p>${data.title}</p>
    </div>
    <div class="result-block__field">
      <span>Por que esse título</span>
      <p>${data.reasoning}</p>
    </div>
    <div class="result-block__field">
      <span>Alternativas</span>
      <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:6px;">
        ${data.alternatives.map((t) => `<li>${t}</li>`).join("")}
      </ul>
    </div>
  `;
}

/**
 * Renderiza o bloco de estratégia de preço.
 * @param {object} data - MOCK_MARKETING_RESULT.pricingStrategy
 */
function renderPricingStrategy(data) {
  const box = document.getElementById("mktPricing");
  box.innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">Sugerido: ${formatCurrency(data.suggestedPrice)}</span>
      <span class="tag tag--warn">Faixa: ${formatCurrency(data.minPrice)} - ${formatCurrency(data.maxPrice)}</span>
    </div>
    <div class="result-block__field">
      <span>Por que essa faixa</span>
      <p>${data.reasoning}</p>
    </div>
  `;
}

/**
 * Renderiza o bloco de estimativa de vendas.
 * @param {object} data - MOCK_MARKETING_RESULT.salesEstimate
 */
function renderSalesEstimate(data) {
  const box = document.getElementById("mktSalesEstimate");
  box.innerHTML = `
    <div class="result-block__tags">
      <span class="tag tag--ok">${data.monthlyUnits} un./mês</span>
      <span class="tag tag--ok">${formatCurrency(data.monthlyRevenue)}/mês</span>
    </div>
    <div class="result-block__field">
      <span>Como chegamos nesse número</span>
      <p>${data.reasoning}</p>
    </div>
  `;
}

/**
 * Renderiza o bloco de melhor época para vender.
 * @param {object} data - MOCK_MARKETING_RESULT.bestSeason
 */
function renderBestSeason(data) {
  const box = document.getElementById("mktBestSeason");
  box.innerHTML = `
    <div class="result-block__tags">
      ${data.peakMonths.map((m) => `<span class="tag tag--warn">${m}</span>`).join("")}
    </div>
    <div class="result-block__field">
      <span>Por quê</span>
      <p>${data.reasoning}</p>
    </div>
  `;
}

/**
 * Renderiza a lista de ansiedades do comprador.
 * @param {string[]} items - MOCK_MARKETING_RESULT.buyerAnxieties
 */
function renderAnxieties(items) {
  const box = document.getElementById("mktAnxieties");
  box.innerHTML = `
    <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:8px;">
      ${items.map((i) => `<li>${i}</li>`).join("")}
    </ul>
  `;
}

/**
 * Renderiza a lista de benefícios do produto.
 * @param {string[]} items - MOCK_MARKETING_RESULT.productBenefits
 */
function renderBenefits(items) {
  const box = document.getElementById("mktBenefits");
  box.innerHTML = `
    <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:8px;">
      ${items.map((i) => `<li>${i}</li>`).join("")}
    </ul>
  `;
}

/**
 * Renderiza o bloco de palavras-chave e tags.
 * @param {object} data - MOCK_MARKETING_RESULT.keywords
 */
function renderKeywords(data) {
  const box = document.getElementById("mktKeywords");
  box.innerHTML = `
    <div class="result-block__field">
      <span>Palavras-chave principais</span>
      <div class="result-block__tags">
        ${data.primary.map((k) => `<span class="tag tag--ok">${k}</span>`).join("")}
      </div>
    </div>
    <div class="result-block__field">
      <span>Palavras-chave secundárias</span>
      <div class="result-block__tags">
        ${data.secondary.map((k) => `<span class="tag tag--warn">${k}</span>`).join("")}
      </div>
    </div>
    <div class="result-block__field">
      <span>Tags do anúncio</span>
      <div class="result-block__tags">
        ${data.tags.map((k) => `<span class="tag tag--warn">${k}</span>`).join("")}
      </div>
    </div>
  `;
}

/**
 * Monta o texto final do anúncio (título + descrição + bullets),
 * no formato pronto para colar no Mercado Livre.
 * @param {object} data - MOCK_MARKETING_RESULT.fullAd
 * @returns {string}
 */
function buildFullAdText(data) {
  const bullets = data.bullets.map((b) => `• ${b}`).join("\n");
  return `${data.title}\n\n${data.description}\n\nPRINCIPAIS BENEFÍCIOS:\n${bullets}`;
}

/**
 * Renderiza o bloco do anúncio completo e configura o botão de copiar.
 * @param {object} data - MOCK_MARKETING_RESULT.fullAd
 */
function renderFullAd(data) {
  const box = document.getElementById("mktFullAd");
  const fullText = buildFullAdText(data);

  box.innerHTML = `
    <div class="result-block__field">
      <span>Título</span>
      <p>${data.title}</p>
    </div>
    <div class="result-block__field">
      <span>Descrição</span>
      <p style="white-space: pre-line;">${data.description}</p>
    </div>
    <div class="result-block__field">
      <span>Principais benefícios</span>
      <ul style="padding-left: 18px; display:flex; flex-direction:column; gap:6px;">
        ${data.bullets.map((b) => `<li>${b}</li>`).join("")}
      </ul>
    </div>
  `;

  // Configura o botão de copiar para pegar o texto completo montado
  const copyBtn = document.getElementById("copyFullAd");
  copyBtn.onclick = () => copyToClipboard(fullText, copyBtn);
}

/**
 * Renderiza a lista de perguntas frequentes.
 * @param {object[]} items - MOCK_MARKETING_RESULT.faq
 */
function renderFaq(items) {
  const box = document.getElementById("mktFaq");
  box.innerHTML = items
    .map(
      (item) => `
      <div class="result-block__field">
        <span>${item.question}</span>
        <p>${item.answer}</p>
      </div>
    `
    )
    .join("");
}

/**
 * Copia um texto para a área de transferência e dá feedback visual no botão.
 * @param {string} text
 * @param {HTMLElement} button
 */
function copyToClipboard(text, button) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const original = button.textContent;
      button.textContent = "Copiado!";
      setTimeout(() => {
        button.textContent = original;
      }, 2000);
    })
    .catch(() => {
      alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    });
}

/**
 * Simula a chamada ao agente de IA (substitua por fetch real).
 * @returns {Promise<object>} resolve com MOCK_MARKETING_RESULT
 */
function simulateMarketingAnalysis() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_MARKETING_RESULT), 1800);
  });
}

/**
 * Renderiza todos os blocos do pacote de marketing.
 * @param {object} data - MOCK_MARKETING_RESULT
 */
function renderMarketingResult(data) {
  renderMarketAnalysis(data.marketAnalysis);
  renderTitle(data.optimizedTitle);
  renderPricingStrategy(data.pricingStrategy);
  renderSalesEstimate(data.salesEstimate);
  renderBestSeason(data.bestSeason);
  renderAnxieties(data.buyerAnxieties);
  renderBenefits(data.productBenefits);
  renderKeywords(data.keywords);
  renderFullAd(data.fullAd);
  renderFaq(data.faq);
}

/**
 * Inicializa o formulário de marketing.
 */
function initMarketing() {
  const form = document.getElementById("marketingForm");
  const loading = document.getElementById("marketingLoading");
  const result = document.getElementById("marketingResult");
  const submitBtn = document.getElementById("marketingSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("marketingInput").value.trim();
    if (!input) return;

    // Mostra estado de carregamento
    result.classList.add("is-hidden");
    loading.classList.remove("is-hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Gerando…";

    try {
      // ----- SUBSTITUIR pela chamada real ao backend -----
      const data = await simulateMarketingAnalysis();
      // -----------------------------------------------------

      renderMarketingResult(data);

      loading.classList.add("is-hidden");
      result.classList.remove("is-hidden");
    } catch (err) {
      loading.classList.add("is-hidden");
      alert("Erro ao gerar o pacote de marketing. Tente novamente.");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gerar pacote";
    }
  });
}
