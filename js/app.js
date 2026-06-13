/*
  app.js
  ------
  Ponto de entrada do dashboard. Aguarda o DOM carregar e
  inicializa todos os módulos, na ordem correta:

  1. Navegação e seletor de conta (precisam existir primeiro,
     pois os outros módulos escutam o evento "accountChanged"
     e leem a conta selecionada).
  2. Cada view (overview, concorrentes, analisador, imagens,
     campanhas, precificação, alertas).

  Também define o nome do usuário logado no avatar do topo —
  em produção, isso viria dos dados de autenticação do usuário.
*/

document.addEventListener("DOMContentLoaded", () => {
  // ----- Usuário logado (placeholder) -----
  // Em produção: pegar do sistema de autenticação (ex: Supabase Auth)
  document.getElementById("userPill").textContent = "M";

  // ----- Navegação e contas -----
  initNavigation();
  initAccountSwitcher();

  // ----- Views -----
  initOverview();
  initCompetitors();
  initAnalyzer();
  initImages();
  initCampaigns();
  initPricing();
  initAlerts();
});
