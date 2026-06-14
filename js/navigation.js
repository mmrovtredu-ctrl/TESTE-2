// js/navigation.js
// ─────────────────────────────────────────────────────────────
// Navegação entre views + seletor de 4 contas ML com:
// - Status de conexão em tempo real via /api/accounts
// - Botão Conectar ML (abre OAuth)
// - Botão Desconectar (limpa tokens no Supabase)
// - Feedback de retorno do OAuth (?ml_connected=true)
// ─────────────────────────────────────────────────────────────

// ─── NAVEGAÇÃO ────────────────────────────────────────────────

function setActiveView(viewName) {
  document.querySelectorAll('.view').forEach(section => {
    section.classList.toggle('is-active', section.dataset.view === viewName);
  });
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === viewName);
  });
  document.querySelectorAll('.bottom-nav__item').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === viewName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavigation() {
  document.querySelectorAll('.sidebar .nav-item, .bottom-nav__item').forEach(btn => {
    btn.addEventListener('click', () => setActiveView(btn.dataset.view));
  });
}

// ─── SELETOR DE CONTAS ────────────────────────────────────────

// Cache global das contas (carregado do /api/accounts)
window._mlAccounts = [];

// Nomes fixos (fallback offline)
const ACCOUNT_DEFAULTS = [
  { account_id: 'acc_1', account_name: 'Urso Forte', connected: false },
  { account_id: 'acc_2', account_name: 'TecService', connected: false },
  { account_id: 'acc_3', account_name: 'Ice',        connected: false },
  { account_id: 'acc_4', account_name: 'Breno',      connected: false },
];

async function loadAccountsFromAPI() {
  try {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.accounts || ACCOUNT_DEFAULTS;
  } catch (err) {
    console.warn('[nav] /api/accounts falhou, usando fallback:', err);

    // Fallback via Supabase direto (lê apenas colunas públicas)
    try {
      const { data } = await supabaseClient
        .from('ml_accounts_status')
        .select('account_id, account_name, connected, token_status');

      if (data && data.length > 0) {
        return ACCOUNT_DEFAULTS.map(def => {
          const saved = data.find(d => d.account_id === def.account_id);
          return { ...def, ...saved };
        });
      }
    } catch (sbErr) {
      console.warn('[nav] Supabase fallback também falhou:', sbErr);
    }

    return ACCOUNT_DEFAULTS;
  }
}

async function initAccountSwitcher() {
  const select = document.getElementById('accountSelect');
  const status = document.getElementById('accountStatus');

  // Carrega status real das contas
  const accounts = await loadAccountsFromAPI();
  window._mlAccounts = accounts;

  // Popula o <select>
  select.innerHTML = '';
  accounts.forEach(account => {
    const option       = document.createElement('option');
    option.value       = account.account_id;
    const icon         = account.connected ? '✅' : '⚠️';
    option.textContent = `${account.account_name} ${icon}`;
    select.appendChild(option);
  });

  function getCurrentAccount() {
    return accounts.find(a => a.account_id === select.value) || accounts[0];
  }

  function updateStatus() {
    const account = getCurrentAccount();
    if (!account) return;

    const isConnected = account.connected;
    status.textContent = '●';
    status.classList.toggle('is-offline', !isConnected);
    status.title = isConnected
      ? `${account.account_name} conectada ao Mercado Livre`
      : `${account.account_name} não conectada — clique em "Conectar ML"`;

    updateConnectionButtons(account);
  }

  // Troca de conta → notifica todos os módulos
  select.addEventListener('change', () => {
    updateStatus();
    document.dispatchEvent(new CustomEvent('accountChanged', {
      detail: { accountId: select.value },
    }));
  });

  updateStatus();

  // Recarrega status das contas a cada 5 minutos (tokens podem renovar)
  setInterval(async () => {
    const fresh = await loadAccountsFromAPI();
    window._mlAccounts = fresh;
    fresh.forEach(account => {
      const opt = select.querySelector(`option[value="${account.account_id}"]`);
      if (opt) {
        const icon         = account.connected ? '✅' : '⚠️';
        opt.textContent    = `${account.account_name} ${icon}`;
      }
    });
    updateStatus();
  }, 5 * 60 * 1000);

  // Verifica retorno do OAuth na URL
  checkMLConnectionReturn(accounts);
}

// ─── BOTÕES CONECTAR / DESCONECTAR ────────────────────────────

function updateConnectionButtons(account) {
  renderConnectButton(account);
  renderDisconnectButton(account);
}

function renderConnectButton(account) {
  let btn = document.getElementById('mlConnectBtn');

  if (!btn) {
    btn = document.createElement('button');
    btn.id        = 'mlConnectBtn';
    btn.className = 'btn btn--primary';
    btn.style.cssText = 'font-size:0.78rem;padding:6px 12px;margin-left:8px;';
    document.querySelector('.topbar__user').prepend(btn);
  }

  if (account.connected) {
    btn.textContent       = '✅ Conectado';
    btn.style.background  = 'var(--color-positive)';
    btn.style.color       = '#fff';
    btn.disabled          = true;
    btn.onclick           = null;
  } else {
    btn.textContent       = '🔗 Conectar ML';
    btn.style.background  = 'var(--color-accent)';
    btn.style.color       = 'var(--color-accent-text, #1a1206)';
    btn.disabled          = false;
    btn.onclick = () => {
      window.location.href =
        `/api/connect?account_id=${account.account_id}` +
        `&account_name=${encodeURIComponent(account.account_name)}`;
    };
  }
}

function renderDisconnectButton(account) {
  let btn = document.getElementById('mlDisconnectBtn');

  if (!account.connected) {
    if (btn) btn.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement('button');
    btn.id        = 'mlDisconnectBtn';
    btn.className = 'btn btn--ghost';
    btn.style.cssText = 'font-size:0.75rem;padding:5px 10px;margin-left:6px;';
    document.querySelector('.topbar__user').prepend(btn);
  }

  btn.textContent = '🔌 Desconectar';
  btn.onclick = async () => {
    if (!confirm(`Desconectar a conta "${account.account_name}"?`)) return;

    btn.disabled     = true;
    btn.textContent  = 'Desconectando…';

    try {
      const res = await fetch('/api/disconnect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ account_id: account.account_id }),
      });

      if (res.ok) {
        // Atualiza UI imediatamente sem reload
        const accountObj = window._mlAccounts.find(a => a.account_id === account.account_id);
        if (accountObj) accountObj.connected = false;

        const opt = document.querySelector(`#accountSelect option[value="${account.account_id}"]`);
        if (opt) opt.textContent = `${account.account_name} ⚠️`;

        updateConnectionButtons({ ...account, connected: false });
        document.dispatchEvent(new CustomEvent('accountChanged', {
          detail: { accountId: account.account_id },
        }));
      } else {
        alert('Erro ao desconectar. Tente novamente.');
        btn.disabled    = false;
        btn.textContent = '🔌 Desconectar';
      }
    } catch (err) {
      console.error('[nav] Erro desconectar:', err);
      alert('Erro ao desconectar.');
      btn.disabled    = false;
      btn.textContent = '🔌 Desconectar';
    }
  };
}

// ─── RETORNO DO OAUTH ─────────────────────────────────────────

function checkMLConnectionReturn(accounts) {
  const params    = new URLSearchParams(window.location.search);
  const connected = params.get('ml_connected');
  const accountId = params.get('account');
  const mlError   = params.get('ml_error');

  if (connected && accountId) {
    const account = accounts.find(a => a.account_id === accountId);
    const name    = account?.account_name || accountId;
    alert(`✅ Loja "${name}" conectada com sucesso ao Mercado Livre!`);
    window.history.replaceState({}, document.title, '/');

    // Força recarga do status das contas para refletir a nova conexão
    loadAccountsFromAPI().then(fresh => {
      window._mlAccounts = fresh;
      const sel = document.getElementById('accountSelect');
      if (sel) {
        fresh.forEach(acc => {
          const opt = sel.querySelector(`option[value="${acc.account_id}"]`);
          if (opt) opt.textContent = `${acc.account_name} ${acc.connected ? '✅' : '⚠️'}`;
        });
        document.dispatchEvent(new CustomEvent('accountChanged', {
          detail: { accountId },
        }));
      }
    });
  }

  if (mlError) {
    const msgs = {
      oauth_cancelado:  'Autorização cancelada pelo usuário.',
      sem_codigo:       'Código de autorização não recebido.',
      token_falhou:     'Erro ao obter token. Tente novamente.',
      token_vazio:      'ML não retornou token válido.',
      supabase_falhou:  'Erro ao salvar conexão no banco. Tente novamente.',
      conta_invalida:   'Conta inválida. Tente novamente.',
      config_incompleta:'Configuração incompleta no servidor.',
      erro_interno:     'Erro interno. Tente novamente.',
    };
    alert(`⚠️ ${msgs[mlError] || `Erro: ${mlError}`}`);
    window.history.replaceState({}, document.title, '/');
  }
}
