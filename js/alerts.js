/*
  alerts.js
  ---------
  Preenche a view "Alertas":
  - Painel de status do monitoramento (última/próxima verificação,
    quantos produtos e concorrentes são monitorados, alertas 24h)
  - Lista de alertas detalhados (queda de preço, sem estoque,
    volta ao estoque, novo concorrente)
  - Badge de notificações no topo (sininho)

  Dados de MOCK_MONITOR_ALERTS_V2 e MOCK_MONITOR_STATUS (data/mockData_v2.js).

  EM PRODUÇÃO — COMO FUNCIONA O MONITORAMENTO DE 2 EM 2 HORAS:
  Um job agendado (cron, ex: a cada 2h) no backend deve:
  1. Para cada produto do catálogo (MOCK_CATALOG), buscar os
     concorrentes atuais via API/scraping do Mercado Livre
  2. Comparar preço e estoque com o snapshot salvo na verificação
     anterior (tabela `competitor_snapshots` no Supabase)
  3. Se o preço caiu, o estoque zerou, voltou ao estoque, ou um
     novo concorrente relevante apareceu, inserir um registro na
     tabela `monitor_alerts`
  4. Atualizar `monitor_status` com lastCheckAt/nextCheckAt

  O front (este arquivo) apenas LÊ essas tabelas via Supabase e
  exibe — toda a lógica de comparação roda no backend/job.
*/

/**
 * Formata uma data ISO para "dd/mm HH:MM".
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Retorna o ícone correspondente ao tipo de alerta.
 * @param {string} type
 * @returns {string}
 */
function alertIcon(type) {
  const icons = {
    price_drop: "💲",
    out_of_stock: "📦",
    back_in_stock: "🔄",
    new_competitor: "🆕",
  };
  return icons[type] || "🔔";
}

/**
 * Retorna a classe de severidade para a borda do alerta.
 * @param {string} severity
 * @returns {string}
 */
function severityClass(severity) {
  const map = { alta: "alert-item--high", media: "alert-item--medium", baixa: "alert-item--low" };
  return map[severity] || "";
}

/**
 * Renderiza o painel de status do monitoramento.
 */
function renderMonitorStatus() {
  const accountId = getCurrentAccountId();
  const status = MOCK_MONITOR_STATUS[accountId];
  const box = document.getElementById("monitorStatus");

  if (!status) {
    box.innerHTML = `<p class="form-hint">Monitoramento ainda não configurado para esta conta.</p>`;
    return;
  }

  box.innerHTML = `
    <div class="monitor-status__grid">
      <div class="monitor-status__item">
        <span class="monitor-status__label">Última verificação</span>
        <strong>${formatDateTime(status.lastCheckAt)}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Próxima verificação</span>
        <strong>${formatDateTime(status.nextCheckAt)}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Produtos monitorados</span>
        <strong>${status.productsMonitored}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Concorrentes acompanhados</span>
        <strong>${status.competitorsTracked}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Alertas (24h)</span>
        <strong>${status.alertsLast24h}</strong>
      </div>
    </div>
  `;
}

/**
 * Renderiza a lista de alertas da conta selecionada.
 */
function renderAlertList() {
  const accountId = getCurrentAccountId();
  const alerts = MOCK_MONITOR_ALERTS_V2[accountId] || [];
  const list = document.getElementById("alertList");

  list.innerHTML = "";

  if (alerts.length === 0) {
    list.innerHTML = `<li class="alert-item"><div class="alert-item__body"><span class="alert-item__title">Nenhum alerta por aqui</span><span class="alert-item__meta">Você será notificado quando um concorrente baixar o preço ou ficar sem estoque.</span></div></li>`;
    updateAlertsBadge();
    return;
  }

  alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.className = `alert-item ${severityClass(alert.severity)}` + (alert.unread ? " is-unread" : "");

    let valueChange = "";
    if (alert.type === "price_drop") {
      valueChange = `${formatCurrency(alert.previousValue)} → ${formatCurrency(alert.currentValue)}`;
    } else if (alert.type === "out_of_stock") {
      valueChange = `${alert.previousValue} un. → 0 un.`;
    } else if (alert.type === "back_in_stock") {
      valueChange = `0 un. → ${alert.currentValue} un.`;
    }

    li.innerHTML = `
      <span class="alert-item__icon">${alertIcon(alert.type)}</span>
      <div class="alert-item__body">
        <span class="alert-item__title">${alert.productName} — ${alert.competitor}</span>
        <span class="alert-item__meta">${alert.message}</span>
        ${valueChange ? `<span class="alert-item__meta">${valueChange} • Seu preço: ${formatCurrency(alert.yourPrice)}</span>` : ""}
        <span class="alert-item__meta">Verificado em ${formatDateTime(alert.checkedAt)}</span>
      </div>
    `;
    list.appendChild(li);
  });

  updateAlertsBadge();
}

/**
 * Atualiza o número exibido no sininho de notificações do topo,
 * contando alertas não lidos da conta atual.
 */
function updateAlertsBadge() {
  const accountId = getCurrentAccountId();
  const alerts = MOCK_MONITOR_ALERTS_V2[accountId] || [];
  const unreadCount = alerts.filter((a) => a.unread).length;

  const badge = document.getElementById("alertsCount");
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? "flex" : "none";
}

/**
 * Marca todos os alertas da conta atual como lidos.
 */
function markAllAlertsRead() {
  const accountId = getCurrentAccountId();
  const alerts = MOCK_MONITOR_ALERTS_V2[accountId] || [];
  alerts.forEach((a) => (a.unread = false));
  renderAlertList();
}

/**
 * Inicializa a view de alertas e os listeners relacionados.
 */
function initAlerts() {
  renderMonitorStatus();
  renderAlertList();

  document.getElementById("markAllRead").addEventListener("click", markAllAlertsRead);

  // O sininho do topo leva direto para a view de alertas
  document.getElementById("alertsBtn").addEventListener("click", () => {
    setActiveView("alerts");
  });

  document.addEventListener("accountChanged", () => {
    renderMonitorStatus();
    renderAlertList();
  });
}
