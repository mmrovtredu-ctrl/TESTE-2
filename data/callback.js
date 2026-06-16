// api/auth/callback.js
// Recebe o code OAuth do ML, troca por access_token + refresh_token
// e salva na linha correta do Supabase (cada conta tem a sua linha).

export default async function handler(req, res) {
  const { code, state, error: mlError } = req.query;

  if (mlError) {
    console.error('[callback] ML retornou erro:', mlError);
    return res.redirect('/?ml_error=oauth_cancelado');
  }
  if (!code) return res.redirect('/?ml_error=sem_codigo');

  let accountId = 'acc_1';
  let accountName = 'Loja';
  try {
    const parsed = JSON.parse(decodeURIComponent(state || '{}'));
    accountId   = parsed.account_id   || accountId;
    accountName = parsed.account_name || accountName;
  } catch (e) {
    console.warn('[callback] Erro ao parsear state:', e);
  }

  const validAccounts = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];
  if (!validAccounts.includes(accountId)) {
    return res.redirect('/?ml_error=conta_invalida');
  }

  const clientId     = (process.env.ML_CLIENT_ID         || '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET     || '').trim();
  const redirectUri  = (process.env.ML_REDIRECT_URI      || '').trim();
  const supabaseUrl  = (process.env.SUPABASE_URL         || '').trim();
  const supabaseKey  = (process.env.SUPABASE_SERVICE_KEY || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(`/?ml_error=config_incompleta&account=${accountId}`);
  }

  try {
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error(`[callback] Erro token ML (${accountId}):`, tokenData);
      return res.redirect(`/?ml_error=token_falhou&account=${accountId}`);
    }

    const { access_token, refresh_token, expires_in, user_id } = tokenData;

    const saveRes = await fetch(`${supabaseUrl}/rest/v1/ml_accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        account_id: accountId,
        account_name: accountName,
        ml_user_id: String(user_id),
        access_token,
        refresh_token,
        expires_in: expires_in || 21600,
        connected: true,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!saveRes.ok) {
      console.error(`[callback] Supabase save (${accountId}):`, await saveRes.text());
      return res.redirect(`/?ml_error=supabase_falhou&account=${accountId}`);
    }

    return res.redirect(`/?ml_connected=true&account=${accountId}`);
  } catch (error) {
    console.error(`[callback] Erro interno (${accountId}):`, error);
    return res.redirect(`/?ml_error=erro_interno&account=${accountId}`);
  }
}
