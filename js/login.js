/*
  login.js
  --------
  Lógica do formulário de login.

  Fluxo:
  1. Usuário digita email e senha
  2. Chamamos supabaseClient.auth.signInWithPassword()
  3. Se der certo, o Supabase grava a sessão automaticamente
     (no localStorage) e redirecionamos para o dashboard
  4. Se der erro, mostramos a mensagem na tela
*/

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginBtn");

  // Se já existe uma sessão ativa, manda direto pro dashboard
  checkExistingSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    errorBox.classList.remove("is-visible");
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando…";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.textContent = traduzirErro(error.message);
      errorBox.classList.add("is-visible");
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
      return;
    }

    // Login OK — vai para o dashboard
    window.location.href = "index.html";
  });
});

/**
 * Se o usuário já estiver logado, pula a tela de login.
 */
async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "index.html";
  }
}

/**
 * Traduz as mensagens de erro mais comuns do Supabase para PT-BR.
 * @param {string} message
 * @returns {string}
 */
function traduzirErro(message) {
  if (message.includes("Invalid login credentials")) {
    return "Email ou senha incorretos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Este email ainda não foi confirmado.";
  }
  return "Não foi possível entrar. Tente novamente.";
}
