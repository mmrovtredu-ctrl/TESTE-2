/*
  overview.js
  -----------
  Preenche a view "Visão geral":
  - Cards de KPI (vendas, faturamento, visitas, conversão)
  - Gráfico de vendas por dia (Chart.js)
  - Lista de produtos em alta / vendendo pouco
  - Tabela "seu preço vs concorrência"

  Os dados vêm de MOCK_OVERVIEW e MOCK_COMPETITOR_DATA (data/mockData.js).
  Para integrar com a API real, troque essas constantes por chamadas
  fetch() que retornem objetos no mesmo formato.
*/

let salesChartInstance = null;

/**
 * Atualiza os 4 cards de KPI no topo da visão geral.
 * @param {object} data - dados de MOCK_OVERVIEW[accountId]
 */
function renderOverviewKpis(data) {
  const { kpis } = data;

  document.getElementById("kpiSales").textContent = formatNumber(kpis.sales);
  document.getElementById("kpiRevenue").textContent = formatCurrency(kpis.revenue);
  document.getElementById("kpiVisits").textContent = formatNumber(kpis.visits);
  document.getElementById("kpiConversion").textContent = kpis.conversion.toFixed(1) + "%";

  setTrend("kpiSalesTrend", kpis.salesTrend);
  setTrend("kpiRevenueTrend", kpis.revenueTrend);
  setTrend("kpiVisitsTrend", kpis.visitsTrend);
  setTrend("kpiConversionTrend", kpis.conversionTrend);
}

/**
 * Define o texto e a cor (verde/vermelho) de um indicador de tendência.
 * @param {string} elementId
 * @param {number} value
 */
function setTrend(elementId, value) {
  const el = document.getElementById(elementId);
  el.textContent = formatTrend(value) + " vs período anterior";
  el.className = "kpi-card__trend " + trendClass(value);
}

/**
 * Renderiza (ou atualiza) o gráfico de vendas por dia.
 * @param {number[]} salesByDay - array com 14 valores
 */
function renderSalesChart(salesByDay) {
  const ctx = document.getElementById("salesChart");

  const labels = salesByDay.map((_, i) => `D${i + 1}`);

  // Se já existe um gráfico, destrói antes de criar outro (evita duplicar)
  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Vendas",
          data: salesByDay,
          borderColor: "#ffb454",
          backgroundColor: "rgba(255, 180, 84, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#5d7186" } },
        y: { grid: { color: "#213548" }, ticks: { color: "#5d7186" } },
      },
    },
  });
}

/**
 * Renderiza a lista de produtos (em alta ou vendendo pouco) conforme a aba ativa.
 * @param {object} data - dados de MOCK_OVERVIEW[accountId]
 * @param {string} tab - "up" ou "down"
 */
function renderProductPerfList(data, tab) {
  const list = document.getElementById("productPerfList");
  const items = tab === "up" ? data.productsUp : data.productsDown;

  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = `<li><span class="product-list__name">Nenhum produto nesta categoria</span></li>`;
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    const trendClassName = item.trend.startsWith("+") ? "tag--ok" : "tag--danger";
    li.innerHTML = `
      <span class="product-list__name">${item.name}</span>
      <span class="product-list__meta">
        ${item.sales} vendas
        <span class="tag ${trendClassName}">${item.trend}</span>
      </span>
    `;
    list.appendChild(li);
  });
}

/**
 * Inicializa as abas "Em alta" / "Vendendo pouco".
 * @param {object} data - dados da conta atual
 */
function initProductPerfTabs(data) {
  const tabs = document.querySelectorAll("#productPerfTabs .tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      renderProductPerfList(data, tab.dataset.tab);
    });
  });
}

/**
 * Renderiza a tabela "seu preço vs menor concorrente".
 * Usa os produtos do monitor de concorrentes (MOCK_COMPETITOR_DATA).
 * @param {string} accountId
 */
function renderCompetitorTable(accountId) {
  const tbody = document.querySelector("#competitorTable tbody");
  tbody.innerHTML = "";

  const accountData = MOCK_COMPETITOR_DATA[accountId];

  if (!accountData || accountData.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum produto monitorado para esta conta ainda.</td></tr>`;
    return;
  }

  accountData.products.forEach((product) => {
    // Encontra o concorrente com menor preço
    const cheapest = product.competitors.reduce((min, c) => (c.price < min.price ? c : min), product.competitors[0]);
    const diff = product.yourPrice - cheapest.price;
    const diffPct = (diff / product.yourPrice) * 100;

    let statusTag;
    if (diff > 0) {
      statusTag = `<span class="tag tag--danger">Você está mais caro</span>`;
    } else if (diff < 0) {
      statusTag = `<span class="tag tag--ok">Você está mais barato</span>`;
    } else {
      statusTag = `<span class="tag tag--warn">Preço igual</span>`;
    }

    const stockText = cheapest.stock > 0 ? `${cheapest.stock} un.` : "Sem estoque";
    const stockTagClass = cheapest.stock > 0 ? "" : "tag--danger";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${formatCurrency(product.yourPrice)}</td>
      <td>${formatCurrency(cheapest.price)} <span style="color:var(--color-text-faint)">(${cheapest.seller})</span></td>
      <td class="${diff > 0 ? 'is-negative' : diff < 0 ? 'is-positive' : ''}" style="color:${diff > 0 ? 'var(--color-negative)' : diff < 0 ? 'var(--color-positive)' : 'inherit'}">
        ${formatTrend(-diffPct)}
      </td>
      <td>${cheapest.stock === 0 ? `<span class="tag ${stockTagClass}">${stockText}</span>` : stockText}</td>
      <td>${statusTag}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Carrega e renderiza toda a view "Visão geral" para a conta selecionada.
 */
function loadOverview() {
  const accountId = getCurrentAccountId();
  const data = MOCK_OVERVIEW[accountId];

  if (!data) return;

  renderOverviewKpis(data);
  renderSalesChart(data.salesByDay);
  initProductPerfTabs(data);
  renderProductPerfList(data, "up");
  // Reseta a aba ativa visualmente para "Em alta"
  document.querySelectorAll("#productPerfTabs .tab").forEach((t, i) => t.classList.toggle("is-active", i === 0));
  renderCompetitorTable(accountId);
}

/**
 * Inicializa a view de visão geral: carrega dados e configura o botão de atualizar.
 */
function initOverview() {
  loadOverview();

  document.getElementById("refreshOverview").addEventListener("click", () => {
    // Em produção, aqui você faria uma chamada real à API antes de re-renderizar.
    loadOverview();
  });

  // Recarrega quando o usuário troca de conta no topo
  document.addEventListener("accountChanged", loadOverview);
}
