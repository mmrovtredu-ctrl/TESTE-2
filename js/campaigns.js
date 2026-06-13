/*
  campaigns.js
  ------------
  Preenche a view "Campanhas":
  - KPIs de investimento, ACOS, cliques e CTR
  - Tabela de campanhas ativas
  - Lista de recomendações geradas pelo agente de IA

  Dados de MOCK_CAMPAIGNS[accountId] (data/mockData.js).
  Em produção, viria da API de Product Ads do Mercado Livre +
  uma chamada ao agente de IA para gerar as recomendações.
*/

/**
 * Renderiza os KPIs de campanha no topo da view.
 * @param {object} kpis
 */
function renderCampaignKpis(kpis) {
  document.getElementById("campSpend").textContent = formatCurrency(kpis.spend);
  document.getElementById("campAcos").textContent = kpis.acos.toFixed(1) + "%";
  document.getElementById("campClicks").textContent = formatNumber(kpis.clicks);
  document.getElementById("campCtr").textContent = kpis.ctr.toFixed(1) + "%";
}

/**
 * Renderiza a tabela de campanhas ativas.
 * @param {object[]} campaigns
 */
function renderCampaignsTable(campaigns) {
  const tbody = document.querySelector("#campaignsTable tbody");
  tbody.innerHTML = "";

  if (campaigns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhuma campanha encontrada para esta conta.</td></tr>`;
    return;
  }

  campaigns.forEach((c) => {
    const statusClass = c.status === "ativa" ? "tag--ok" : "tag--warn";
    const acosClass = c.acos > 20 ? "tag--danger" : "tag--ok";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${formatCurrency(c.spend)}</td>
      <td>${formatNumber(c.clicks)}</td>
      <td>${formatNumber(c.conversions)}</td>
      <td><span class="tag ${acosClass}">${c.acos.toFixed(1)}%</span></td>
      <td><span class="tag ${statusClass}">${c.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza a lista de recomendações do agente.
 * @param {string[]} recommendations
 */
function renderRecommendations(recommendations) {
  const list = document.getElementById("recommendationList");
  list.innerHTML = "";

  if (recommendations.length === 0) {
    list.innerHTML = `<li>Nenhuma recomendação no momento.</li>`;
    return;
  }

  recommendations.forEach((rec) => {
    const li = document.createElement("li");
    li.textContent = rec;
    list.appendChild(li);
  });
}

/**
 * Carrega os dados de campanha da conta selecionada.
 */
function loadCampaigns() {
  const accountId = getCurrentAccountId();
  const data = MOCK_CAMPAIGNS[accountId];

  if (!data) {
    // Conta sem dados de campanha cadastrados
    renderCampaignKpis({ spend: 0, acos: 0, clicks: 0, ctr: 0 });
    renderCampaignsTable([]);
    renderRecommendations([]);
    return;
  }

  renderCampaignKpis(data.kpis);
  renderCampaignsTable(data.campaigns);
  renderRecommendations(data.recommendations);
}

/**
 * Inicializa a view de campanhas.
 */
function initCampaigns() {
  loadCampaigns();
  document.addEventListener("accountChanged", loadCampaigns);
}
