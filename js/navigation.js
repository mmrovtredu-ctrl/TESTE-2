/*
  navigation.js
  -------------
  Controla:
  - Troca entre as seções (views) do dashboard, tanto pelo menu
    lateral (desktop) quanto pelo menu inferior (mobile).
  - Seletor de conta no topo (multi-conta ML).
  - Disparo de um evento customizado "accountChanged" sempre que
    o usuário troca de conta, para que cada módulo recarregue
    seus próprios dados.
*/

/**
 * Mostra a view correspondente e atualiza o estado ativo dos menus.
 * @param {string} viewName - nome da view (data-view)
 */
function setActiveView(viewName) {
  // Atualiza as seções de conteúdo
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === viewName);
  });

  // Atualiza o item ativo na sidebar (desktop)
  document.querySelectorAll(".sidebar .nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === viewName);
  });

  // Atualiza o item ativo no menu inferior (mobile)
  document.querySelectorAll(".bottom-nav__item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === viewName);
  });

  // Volta para o topo da página ao trocar de seção
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Inicializa os listeners de navegação (sidebar + menu inferior).
 */
function initNavigation() {
  const navButtons = document.querySelectorAll(
    ".sidebar .nav-item, .bottom-nav__item"
  );

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveView(btn.dataset.view);
    });
  });
}

/**
 * Preenche o seletor de contas com os dados em MOCK_ACCOUNTS
 * e atualiza o indicador de status (online/offline).
 */
function initAccountSwitcher() {
  const select = document.getElementById("accountSelect");
  const status = document.getElementById("accountStatus");

  // Popula as opções a partir dos dados das contas
  MOCK_ACCOUNTS.forEach((account) => {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = account.nickname + (account.connected ? "" : " (desconectada)");
    select.appendChild(option);
  });

  // Atualiza o indicador visual de status da conexão
  function updateStatus() {
    const account = MOCK_ACCOUNTS.find((a) => a.id === select.value);
    status.classList.toggle("is-offline", !account.connected);
    status.title = account.connected
      ? "Conectado à API do Mercado Livre"
      : "Token expirado — reautorize esta conta";
  }

  // Quando o usuário troca de conta, dispara um evento global
  // para que cada módulo (overview, campanhas, etc.) recarregue.
  select.addEventListener("change", () => {
    updateStatus();
    document.dispatchEvent(new CustomEvent("accountChanged", { detail: { accountId: select.value } }));
  });

  updateStatus();
}
