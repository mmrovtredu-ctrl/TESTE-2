// api/auth/callback.js
// ─────────────────────────────────────────────────────────────
// Recebe o code OAuth do ML, troca pelo access_token + refresh_token
// e salva na linha correta do Supabase (cada conta tem a sua linha).
//
// O parâmetro `state` vem do /api/connect e identifica qual
// das 4 contas está sendo conectada.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { code, state, error: mlError } = req.query;

  // ML pode devolver um erro explícito (usuário cancelou, app inativo etc.)
  if (mlError) {
    console.error('[callback] ML retornou erro:', mlError);
    return res.redirect(`/?ml_error=oauth_cancelado`);
  }

  if (!code) {
    return res.redirect('/?ml_error=sem_codigo');
  }

  // Lê o account_id do state
  let accountId   = 'acc_1';
  let accountName = 'Loja';

  try {
    const parsed = JSON.parse(decodeURIComponent(state || '{}'));
    accountId   = parsed.account_id   || accountId;
    accountName = parsed.account_name || accountName;
  } catch (e) {
    console.warn('[callback] Erro ao parsear state:', e);
  }

  // Valida account_id
  const validAccounts = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];
  if (!validAccounts.includes(accountId)) {
    console.error('[callback] account_id inválido:', accountId);
    return res.redirect('/?ml_error=conta_invalida');
  }

  const clientId     = (process.env.ML_CLIENT_ID          || '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET       || '').trim();
  const redirectUri  = (process.env.ML_REDIRECT_URI        || '').trim();
  const supabaseUrl  = (process.env.SUPABASE_URL           || '').trim();
  const supabaseKey  = (process.env.SUPABASE_SERVICE_KEY   || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[callback] Variáveis de ambiente ML não configuradas');
    return res.redirect(`/?ml_error=config_incompleta&account=${accountId}`);
  }

  try {
    // ── 1. Troca o code pelo access_token ────────────────────
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error(`[callback] Erro token ML para ${accountId}:`, tokenData);
      return res.redirect(`/?ml_error=token_falhou&account=${accountId}`);
    }

    const { access_token, refresh_token, expires_in, user_id } = tokenData;

    if (!access_token) {
      console.error(`[callback] ML não retornou access_token para ${accountId}`);
      return res.redirect(`/?ml_error=token_vazio&account=${accountId}`);
    }

    // ── 2. Salva/atualiza o token no Supabase ─────────────────
    // Usa UPSERT por account_id (Prefer: resolution=merge-duplicates)
    const saveRes = await fetch(`${supabaseUrl}/rest/v1/ml_accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:         supabaseKey,
        Authorization:  `Bearer ${supabaseKey}`,
        Prefer:         'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        account_id:    accountId,
        account_name:  accountName,
        ml_user_id:    String(user_id),
        access_token,
        refresh_token,
        expires_in:    expires_in || 21600,
        connected:     true,
        updated_at:    new Date().toISOString(),
      }),
    });

    if (!saveRes.ok) {
      const saveErr = await saveRes.text();
      console.error(`[callback] Supabase save error para ${accountId}:`, saveErr);
      return res.redirect(`/?ml_error=supabase_falhou&account=${accountId}`);
    }

    console.log(`[callback] Conta ${accountId} (${accountName}) conectada com sucesso. ML user_id: ${user_id}`);
    return res.redirect(`/?ml_connected=true&account=${accountId}`);

  } catch (error) {
    console.error(`[callback] Erro interno para ${accountId}:`, error);
    return res.redirect(`/?ml_error=erro_interno&account=${accountId}`);
  }
}
