/*
  app.js
  ------
  Ponto de entrada do dashboard. Aguarda o DOM carregar e
  inicializa todos os módulos, na ordem correta:

  0. Verifica login (redireciona para login.html se não estiver logado)
  1. Navegação e seletor de conta (precisam existir primeiro,
     pois os outros módulos escutam o evento "accountChanged"
     e leem a conta selecionada).
  2. Cada view (overview, catálogo, concorrentes, analisador,
     marketing, imagens, campanhas, precificação, alertas).
*/

document.addEventListener("DOMContentLoaded", async () => {
  // ----- Verifica login -----
  // Se não houver sessão ativa, requireAuth() já redireciona para login.html
  const user = await requireAuth();
  if (!user) return; // interrompe a inicialização, já está saindo da página

  // ----- Usuário logado -----
  // Mostra a primeira letra do email no avatar do topo
  const userPill = document.getElementById("userPill");
  userPill.textContent = user.email.charAt(0).toUpperCase();

  // Clique no avatar = logout
  userPill.addEventListener("click", () => {
    if (confirm("Deseja sair da sua conta?")) {
      logout();
    }
  });

  // ----- Navegação e contas -----
  initNavigation();
  initAccountSwitcher();

  // ----- Views -----
  initOverview();
  initCatalog();
  initCompetitors();
  initAnalyzer();
  initMarketing();
  initImages();
  initCampaigns();
  initPricing();
  initAlerts();
});
