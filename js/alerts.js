/*
  alerts.js
  ---------
  Preenche a view "Alertas" e o badge de notificações no topo.

  Dados de MOCK_ALERTS[accountId] (data/mockData.js).
  Em produção, esses alertas seriam gerados pelo Sistema 1
  (monitor de concorrentes) e armazenados no banco, com um
  endpoint que retorna os alertas não lidos por conta.
*/

/**
 * Retorna o ícone correspondente ao tipo de alerta.
 * @param {string} type - "price" ou "stock"
 * @returns {string}
 */
function alertIcon(type) {
  return type === "price" ? "💲" : "📦";
}

/**
 * Renderiza a lista de alertas da conta selecionada.
 */
function renderAlertList() {
  const accountId = getCurrentAccountId();
  const alerts = MOCK_ALERTS[accountId] || [];
  const list = document.getElementById("alertList");

  list.innerHTML = "";

  if (alerts.length === 0) {
    list.innerHTML = `<li class="alert-item"><div class="alert-item__body"><span class="alert-item__title">Nenhum alerta por aqui</span><span class="alert-item__meta">Você será notificado quando um concorrente baixar o preço ou ficar sem estoque.</span></div></li>`;
    updateAlertsBadge();
    return;
  }

  alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.className = "alert-item" + (alert.unread ? " is-unread" : "");
    li.innerHTML = `
      <span class="alert-item__icon">${alertIcon(alert.type)}</span>
      <div class="alert-item__body">
        <span class="alert-item__title">${alert.title}</span>
        <span class="alert-item__meta">${alert.meta}</span>
        <span class="alert-item__meta">${alert.time}</span>
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
  const alerts = MOCK_ALERTS[accountId] || [];
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
  const alerts = MOCK_ALERTS[accountId] || [];
  alerts.forEach((a) => (a.unread = false));
  renderAlertList();
}

/**
 * Inicializa a view de alertas e os listeners relacionados.
 */
function initAlerts() {
  renderAlertList();

  document.getElementById("markAllRead").addEventListener("click", markAllAlertsRead);

  // O sininho do topo leva direto para a view de alertas
  document.getElementById("alertsBtn").addEventListener("click", () => {
    setActiveView("alerts");
  });

  document.addEventListener("accountChanged", renderAlertList);
}
