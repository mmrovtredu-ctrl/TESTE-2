/*
  analyzer.js
  -----------
  Preenche a view "Analisar produto":
  - Formulário onde o usuário cola um link ou nome de produto
  - Estado de carregamento enquanto o agente "processa"
  - Exibição do anúncio atual vs sugestão otimizada

  INTEGRAÇÃO REAL:
  No lugar de simulateAnalysis(), você vai chamar seu backend, que:
  1. Faz scraping do link do ML (título, descrição, imagens, tags)
  2. Busca o nome do produto no Google Custom Search
  3. Envia tudo para a API da Anthropic com um prompt estruturado
  4. Retorna um JSON no mesmo formato de MOCK_ANALYZER_RESULT
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
 * Simula a chamada ao agente de IA (substitua por fetch real).
 * @returns {Promise<object>} resolve com MOCK_ANALYZER_RESULT
 */
function simulateAnalysis() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_ANALYZER_RESULT), 1400);
  });
}

/**
 * Inicializa o formulário de análise de produto.
 */
function initAnalyzer() {
  const form = document.getElementById("analyzerForm");
  const loading = document.getElementById("analyzerLoading");
  const result = document.getElementById("analyzerResult");
  const submitBtn = document.getElementById("analyzerSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("analyzerInput").value.trim();
    if (!input) return;

    // Mostra estado de carregamento
    result.classList.add("is-hidden");
    loading.classList.remove("is-hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Analisando…";

    try {
      // ----- SUBSTITUIR pela chamada real ao backend -----
      const data = await simulateAnalysis();
      // -----------------------------------------------------

      renderAnalyzerOriginal(data.original);
      renderAnalyzerSuggestion(data.suggestion);

      loading.classList.add("is-hidden");
      result.classList.remove("is-hidden");
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
