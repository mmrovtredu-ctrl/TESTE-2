/*
  campaigns.js
  ------------
  Preenche a view "Campanhas":
  - KPIs de investimento, ACOS, cliques e CTR (totais consolidados)
  - Card "Melhor desempenho" (produto com melhor ACOS/retorno)
  - Card "Precisa de atenção" (produto com pior ACOS/retorno)
  - Tabela de campanhas ativas, EXPANSÍVEL: cada linha pode ser
    aberta para mostrar os produtos (items) daquela campanha
  - Lista de recomendações geradas pelo agente de IA

  Dados de MOCK_CAMPAIGNS_DETAIL[accountId] (data/mockData_v2.js)
  e MOCK_CAMPAIGNS[accountId] (data/mockData.js, recomendações).

  Em produção: GET /advertising/product_ads/campaigns +
  GET /advertising/product_ads/campaigns/{id}/items
*/

/**
 * Renderiza os KPIs totais consolidados no topo da view.
 * @param {object} totals - MOCK_CAMPAIGNS_DETAIL[accountId].totals
 */
function renderCampaignKpis(totals) {
  document.getElementById("campSpend").textContent = formatCurrency(totals.totalSpend30d);
  document.getElementById("campAcos").textContent = totals.totalAcos.toFixed(1) + "%";
  document.getElementById("campClicks").textContent = formatNumber(totals.totalClicks);
  document.getElementById("campCtr").textContent = totals.totalCtr.toFixed(1) + "%";
}

/**
 * Renderiza o card "Melhor desempenho".
 * @param {object} best - MOCK_CAMPAIGNS_DETAIL[accountId].bestPerformer
 */
function renderBestPerformer(best) {
  const box = document.getElementById("campBestPerformer");
  if (!best) {
    box.innerHTML = `<p>Nenhum dado disponível.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="result-block__field">
      <span>Produto</span>
      <p>${best.productName}</p>
    </div>
    <div class="result-block__tags">
      <span class="tag tag--ok">ACOS ${best.acos.toFixed(1)}%</span>
      <span class="tag tag--ok">${formatNumber(best.conversions)} vendas</span>
      <span class="tag tag--warn">Investido ${formatCurrency(best.spend30d)}</span>
      <span class="tag tag--warn">Retorno ${formatCurrency(best.revenue30d)}</span>
    </div>
    <div class="result-block__field">
      <span>Oportunidade</span>
      <p>${best.opportunity}</p>
    </div>
  `;
}

/**
 * Renderiza o card "Precisa de atenção".
 * @param {object} worst - MOCK_CAMPAIGNS_DETAIL[accountId].worstPerformer
 */
function renderWorstPerformer(worst) {
  const box = document.getElementById("campWorstPerformer");
  if (!worst) {
    box.innerHTML = `<p>Nenhum dado disponível.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="result-block__field">
      <span>Produto</span>
      <p>${worst.productName}</p>
    </div>
    <div class="result-block__tags">
      <span class="tag tag--danger">ACOS ${worst.acos.toFixed(1)}%</span>
      <span class="tag tag--warn">${formatNumber(worst.conversions)} vendas</span>
      <span class="tag tag--warn">Investido ${formatCurrency(worst.spend30d)}</span>
      <span class="tag tag--warn">Retorno ${formatCurrency(worst.revenue30d)}</span>
    </div>
    <div class="result-block__field">
      <span>Problema identificado</span>
      <p>${worst.issue}</p>
    </div>
  `;
}

/**
 * Renderiza a tabela de campanhas, com cada linha expansível
 * mostrando os produtos (items) daquela campanha.
 * @param {object[]} campaigns - MOCK_CAMPAIGNS_DETAIL[accountId].campaigns
 */
function renderCampaignsTable(campaigns) {
  const tbody = document.querySelector("#campaignsTable tbody");
  tbody.innerHTML = "";

  if (campaigns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhuma campanha encontrada para esta conta.</td></tr>`;
    return;
  }

  campaigns.forEach((c) => {
    const statusClass = c.status === "ativa" ? "tag--ok" : "tag--warn";
    const acosClass = c.acos > 20 ? "tag--danger" : "tag--ok";

    // Linha principal da campanha
    const tr = document.createElement("tr");
    tr.className = "campaign-row";
    tr.style.cursor = "pointer";
    tr.innerHTML = `
      <td>▸ ${c.name}</td>
      <td>${formatCurrency(c.spend30d)}</td>
      <td>${formatNumber(c.clicks)}</td>
      <td>${formatNumber(c.impressions)}</td>
      <td>${formatNumber(c.conversions)}</td>
      <td><span class="tag ${acosClass}">${c.acos.toFixed(1)}%</span></td>
      <td><span class="tag ${statusClass}">${c.status}</span></td>
    `;
    tbody.appendChild(tr);

    // Linha de detalhe (produtos da campanha), oculta por padrão
    const detailTr = document.createElement("tr");
    detailTr.className = "campaign-detail-row is-hidden";
    const itemsHtml = c.items
      .map(
        (item) => `
        <div class="campaign-item">
          <span class="campaign-item__name">${item.productName}</span>
          <span class="campaign-item__meta">
            Investido ${formatCurrency(item.spend)} •
            ${formatNumber(item.conversions)} vendas •
            ACOS ${item.acos.toFixed(1)}%
          </span>
        </div>
      `
      )
      .join("");

    detailTr.innerHTML = `<td colspan="7"><div class="campaign-items">${itemsHtml}</div></td>`;
    tbody.appendChild(detailTr);

    // Clique na linha principal alterna a visibilidade do detalhe
    tr.addEventListener("click", () => {
      detailTr.classList.toggle("is-hidden");
      tr.querySelector("td:first-child").textContent = detailTr.classList.contains("is-hidden")
        ? `▸ ${c.name}`
        : `▾ ${c.name}`;
    });
  });
}

/**
 * Renderiza a lista de recomendações do agente.
 * @param {string[]} recommendations
 */
function renderRecommendations(recommendations) {
  const list = document.getElementById("recommendationList");
  list.innerHTML = "";

  if (!recommendations || recommendations.length === 0) {
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
  const detail = MOCK_CAMPAIGNS_DETAIL[accountId];
  const basic = MOCK_CAMPAIGNS[accountId];

  if (!detail) {
    // Conta sem dados de campanha cadastrados
    renderCampaignKpis({ totalSpend30d: 0, totalAcos: 0, totalClicks: 0, totalCtr: 0 });
    renderBestPerformer(null);
    renderWorstPerformer(null);
    renderCampaignsTable([]);
    renderRecommendations([]);
    return;
  }

  renderCampaignKpis(detail.totals);
  renderBestPerformer(detail.bestPerformer);
  renderWorstPerformer(detail.worstPerformer);
  renderCampaignsTable(detail.campaigns);
  renderRecommendations(basic ? basic.recommendations : []);
}

/**
 * Inicializa a view de campanhas.
 */
function initCampaigns() {
  loadCampaigns();
  document.addEventListener("accountChanged", loadCampaigns);
}
