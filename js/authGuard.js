/*
  authGuard.js
  ------------
  Protege o dashboard: se o usuário não estiver logado,
  redireciona para a tela de login.

  Também expõe o email do usuário logado e a função de logout,
  usadas em app.js.

  IMPORTANTE: esta é uma proteção do lado do CLIENTE (esconde a
  página de quem não está logado). Ela impede acesso casual ao
  dashboard, mas não substitui regras de segurança no banco
  (Row Level Security do Supabase) para proteger os DADOS.
*/

/**
 * Verifica se existe uma sessão ativa. Se não houver, redireciona
 * para login.html. Se houver, retorna os dados do usuário.
 * @returns {Promise<object|null>}
 */
async function requireAuth() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }

  return data.session.user;
}

/**
 * Faz logout e volta para a tela de login.
 */
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
