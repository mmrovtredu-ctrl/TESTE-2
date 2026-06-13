/*
  competitors.js
  --------------
  Preenche a view "Concorrentes":
  - Seletor de produto do catálogo
  - Gráfico de histórico de preço (você vs menor concorrente)
  - Tabela detalhada com os TOP 5 concorrentes do produto
    selecionado (preço, estoque, vendas, reputação, avaliação, frete)

  Dados de:
  - MOCK_COMPETITOR_DATA (histórico de preço — data/mockData.js)
  - MOCK_COMPETITORS_DETAIL (detalhes dos top 5 — data/mockData_v2.js)

  Em produção:
  - Histórico de preço: job próprio que salva snapshots diários
  - Top 5 detalhado: GET /sites/MLB/search?q={produto} + dados de
    reputação via /users/{seller_id} para cada concorrente
*/

let priceHistoryChartInstance = null;

/**
 * Preenche o seletor de produtos com os itens monitorados da conta atual.
 */
function populateCompetitorProductSelect() {
  const select = document.getElementById("competitorProductSelect");
  const accountId = getCurrentAccountId();
  const accountData = MOCK_COMPETITOR_DATA[accountId];

  select.innerHTML = "";

  if (!accountData || accountData.products.length === 0) {
    select.innerHTML = `<option value="">Nenhum produto monitorado nesta conta</option>`;
    return;
  }

  accountData.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    select.appendChild(option);
  });
}

/**
 * Renderiza o gráfico de histórico de preço para um produto específico.
 * @param {object} product - item de MOCK_COMPETITOR_DATA[accountId].products
 */
function renderPriceHistoryChart(product) {
  const ctx = document.getElementById("priceHistoryChart");

  if (priceHistoryChartInstance) {
    priceHistoryChartInstance.destroy();
  }

  priceHistoryChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: product.history.labels,
      datasets: [
        {
          label: "Seu preço",
          data: product.history.yourPrice,
          borderColor: "#1a1a2e",
          backgroundColor: "transparent",
          tension: 0,
          pointRadius: 0,
          borderDash: [4, 4],
          borderWidth: 2,
        },
        {
          label: "Menor concorrente",
          data: product.history.competitor,
          borderColor: "#5b7fff",
          backgroundColor: "rgba(91, 127, 255, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: "#6b6b7d" } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#a3a0b3" } },
        y: { grid: { color: "#ebe6dc" }, ticks: { color: "#a3a0b3" } },
      },
    },
  });
}

/**
 * Retorna a tag de reputação colorida conforme o nível.
 * @param {string} reputation
 * @returns {string}
 */
function reputationTag(reputation) {
  let cls = "tag--warn";
  if (reputation === "Mercado Líder") cls = "tag--ok";
  if (reputation === "Novo vendedor") cls = "tag--danger";
  return `<span class="tag ${cls}">${reputation}</span>`;
}

/**
 * Renderiza a tabela com os top 5 concorrentes detalhados do produto.
 * @param {string} productId
 */
function renderCompetitorDetailTable(productId) {
  const tbody = document.querySelector("#competitorDetailTable tbody");
  tbody.innerHTML = "";

  const detail = MOCK_COMPETITORS_DETAIL[productId];

  if (!detail || detail.competitors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum concorrente encontrado para este produto.</td></tr>`;
    return;
  }

  detail.competitors.forEach((c) => {
    const stockCell =
      c.stock === 0
        ? `<span class="tag tag--danger">Sem estoque</span>`
        : formatNumber(c.stock);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><a href="${c.link}" target="_blank" rel="noopener">${c.seller}</a></td>
      <td>${formatCurrency(c.price)}</td>
      <td>${stockCell}</td>
      <td>${formatNumber(c.sales30d)}</td>
      <td>${reputationTag(c.reputation)}</td>
      <td>★ ${c.rating.toFixed(1)} (${formatNumber(c.reviewsCount)})</td>
      <td>${c.shipping}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Carrega o produto selecionado e atualiza gráfico + tabela de concorrentes.
 */
function loadSelectedCompetitorProduct() {
  const select = document.getElementById("competitorProductSelect");
  const accountId = getCurrentAccountId();
  const accountData = MOCK_COMPETITOR_DATA[accountId];

  if (!accountData || !select.value) return;

  const product = accountData.products.find((p) => p.id === select.value);
  if (!product) return;

  renderPriceHistoryChart(product);
  renderCompetitorDetailTable(product.id);
}

/**
 * Inicializa a view de concorrentes.
 */
function initCompetitors() {
  populateCompetitorProductSelect();
  loadSelectedCompetitorProduct();

  document.getElementById("competitorProductSelect").addEventListener("change", loadSelectedCompetitorProduct);

  // Quando troca de conta: repopula o seletor e recarrega o gráfico
  document.addEventListener("accountChanged", () => {
    populateCompetitorProductSelect();
    loadSelectedCompetitorProduct();
  });
}
