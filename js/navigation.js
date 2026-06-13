/*
  navigation.js — versão com nomes atualizados das lojas
  Substitui js/navigation.js no GitHub
*/

function setActiveView(viewName) {
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('is-active', section.dataset.view === viewName);
  });
  document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.view === viewName);
  });
  document.querySelectorAll('.bottom-nav__item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.view === viewName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavigation() {
  const navButtons = document.querySelectorAll('.sidebar .nav-item, .bottom-nav__item');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => setActiveView(btn.dataset.view));
  });
}

// Nomes fixos das 4 lojas
const LOJAS = [
  { id: 'acc_1', nickname: 'Urso Forte' },
  { id: 'acc_2', nickname: 'TecService' },
  { id: 'acc_3', nickname: 'Ice' },
  { id: 'acc_4', nickname: 'Breno' },
];

// Busca status de conexão de cada loja no Supabase
async function loadAccountsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('ml_accounts')
      .select('account_id, account_name, connected, ml_user_id');

    if (error || !data || data.length === 0) return LOJAS.map(l => ({ ...l, connected: false }));

    return LOJAS.map(loja => {
      const saved = data.find(d => d.account_id === loja.id);
      return {
        id: loja.id,
        nickname: loja.nickname,
        mlUserId: saved?.ml_user_id || null,
        connected: saved?.connected || false,
      };
    });
  } catch {
    return LOJAS.map(l => ({ ...l, connected: false }));
  }
}

async function initAccountSwitcher() {
  const select = document.getElementById('accountSelect');
  const status = document.getElementById('accountStatus');

  const accounts = await loadAccountsFromSupabase();

  // Salva globalmente para uso nos outros módulos
  window._mlAccounts = accounts;

  select.innerHTML = '';
  accounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = account.nickname + (account.connected ? ' ✅' : ' ⚠️');
    select.appendChild(option);
  });

  function getCurrentAccount() {
    return accounts.find(a => a.id === select.value);
  }

  function updateStatus() {
    const account = getCurrentAccount();
    if (!account) return;
    status.classList.toggle('is-offline', !account.connected);
    status.title = account.connected
      ? `${account.nickname} conectada ao Mercado Livre`
      : `${account.nickname} não conectada — clique em "Conectar ML"`;
    updateConnectButton(account);
  }

  select.addEventListener('change', () => {
    updateStatus();
    document.dispatchEvent(new CustomEvent('accountChanged', {
      detail: { accountId: select.value }
    }));
  });

  updateStatus();
  checkMLConnectionReturn(accounts);
}

function updateConnectButton(account) {
  let btn = document.getElementById('mlConnectBtn');

  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'mlConnectBtn';
    btn.className = 'btn btn--primary';
    btn.style.cssText = 'font-size:0.78rem; padding:6px 12px; margin-left:8px;';
    document.querySelector('.topbar__user').prepend(btn);
  }

  if (account.connected) {
    btn.textContent = '✅ Conectado';
    btn.style.background = 'var(--color-positive)';
    btn.style.color = '#fff';
    btn.onclick = null;
    btn.disabled = true;
  } else {
    btn.textContent = '🔗 Conectar ML';
    btn.style.background = 'var(--color-accent)';
    btn.style.color = 'var(--color-accent-text)';
    btn.disabled = false;
    btn.onclick = () => {
      window.location.href = `/api/connect?account_id=${account.id}&account_name=${encodeURIComponent(account.nickname)}`;
    };
  }
}

function checkMLConnectionReturn(accounts) {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get('ml_connected');
  const accountId = params.get('account');
  const error = params.get('ml_error');

  if (connected && accountId) {
    const account = accounts.find(a => a.id === accountId);
    const name = account?.nickname || accountId;
    alert(`✅ Loja "${name}" conectada com sucesso ao Mercado Livre!`);
    window.history.replaceState({}, document.title, '/');
    document.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }));
  }

  if (error) {
    const msgs = {
      sem_codigo: 'Autorização cancelada.',
      token_falhou: 'Erro ao obter token. Tente novamente.',
      supabase_falhou: 'Erro ao salvar conexão. Tente novamente.',
      erro_interno: 'Erro interno. Tente novamente.',
    };
    alert(`⚠️ ${msgs[error] || 'Erro ao conectar loja.'}`);
    window.history.replaceState({}, document.title, '/');
  }
}
