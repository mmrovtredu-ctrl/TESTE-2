/*
  catalog.js
  ----------
  Preenche a view "Catálogo":
  - KPIs resumidos (ativos, sem estoque, vendas, saúde média)
  - Tabela completa de produtos cadastrados na conta ML
  - Busca por nome/categoria e filtro por status

  Dados de MOCK_CATALOG[accountId] (data/mockData_v2.js).
  Em produção: GET /users/{user_id}/items/search + /items/{id}
  para cada produto (ou em lote via /items?ids=).
*/

let catalogData = [];

/**
 * Calcula e renderiza os KPIs resumidos do catálogo.
 * @param {object[]} products
 */
function renderCatalogKpis(products) {
  const active = products.filter((p) => p.status === "ativo").length;
  const outOfStock = products.filter((p) => p.status === "sem_estoque" || p.stock === 0).length;
  const totalSales = products.reduce((sum, p) => sum + p.sales30d, 0);
  const avgHealth = products.length
    ? Math.round(products.reduce((sum, p) => sum + p.health, 0) / products.length)
    : 0;

  document.getElementById("catalogActiveCount").textContent = active;
  document.getElementById("catalogOutOfStockCount").textContent = outOfStock;
  document.getElementById("catalogTotalSales").textContent = formatNumber(totalSales);
  document.getElementById("catalogAvgHealth").textContent = avgHealth + "%";
}

/**
 * Retorna a tag de status formatada.
 * @param {string} status
 * @returns {string}
 */
function catalogStatusTag(status) {
  const map = {
    ativo: { label: "Ativo", cls: "tag--ok" },
    sem_estoque: { label: "Sem estoque", cls: "tag--danger" },
    pausado: { label: "Pausado", cls: "tag--warn" },
  };
  const info = map[status] || { label: status, cls: "" };
  return `<span class="tag ${info.cls}">${info.label}</span>`;
}

/**
 * Retorna a tag de saúde do anúncio, colorida pela faixa.
 * @param {number} health
 * @returns {string}
 */
function catalogHealthTag(health) {
  let cls = "tag--ok";
  if (health < 60) cls = "tag--danger";
  else if (health < 80) cls = "tag--warn";
  return `<span class="tag ${cls}">${health}%</span>`;
}

/**
 * Renderiza a tabela do catálogo com os produtos filtrados.
 * @param {object[]} products
 */
function renderCatalogTable(products) {
  const tbody = document.querySelector("#catalogTable tbody");
  tbody.innerHTML = "";

  document.getElementById("catalogResultCount").textContent = `${products.length} produto(s)`;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock === 0 ? '<span class="tag tag--danger">0</span>' : formatNumber(p.stock)}</td>
      <td>${formatNumber(p.sales30d)}</td>
      <td>${formatNumber(p.visits30d)}</td>
      <td>${catalogHealthTag(p.health)}</td>
      <td>${catalogStatusTag(p.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Aplica os filtros de busca e status sobre o catálogo da conta atual.
 */
function applyCatalogFilters() {
  const query = document.getElementById("catalogSearchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("catalogStatusFilter").value;

  let filtered = catalogData;

  if (query) {
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );
  }

  if (statusFilter) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  renderCatalogTable(filtered);
}

/**
 * Carrega o catálogo da conta selecionada e renderiza tudo.
 */
function loadCatalog() {
  const accountId = getCurrentAccountId();
  catalogData = MOCK_CATALOG[accountId] || [];

  renderCatalogKpis(catalogData);
  applyCatalogFilters();
}

/**
 * Inicializa a view de catálogo.
 */
function initCatalog() {
  loadCatalog();

  document.getElementById("refreshCatalog").addEventListener("click", loadCatalog);
  document.getElementById("catalogSearchInput").addEventListener("input", applyCatalogFilters);
  document.getElementById("catalogStatusFilter").addEventListener("change", applyCatalogFilters);

  document.addEventListener("accountChanged", loadCatalog);
}
