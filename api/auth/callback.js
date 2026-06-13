// api/auth/callback.js
// Recebe o code do OAuth do ML, troca por token e salva no Supabase

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) return res.redirect('/?ml_error=sem_codigo');

  let accountId = 'acc_1';
  let accountName = 'Loja';

  try {
    const parsed = JSON.parse(decodeURIComponent(state || '{}'));
    accountId = parsed.account_id || accountId;
    accountName = parsed.account_name || accountName;
  } catch (e) {
    console.warn('Erro ao parsear state:', e);
  }

  try {
    // Troca code por token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code,
        redirect_uri: process.env.ML_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Erro token ML:', tokenData);
      return res.redirect(`/?ml_error=token_falhou&account=${accountId}`);
    }

    const { access_token, refresh_token, expires_in, user_id } = tokenData;

    // Salva no Supabase
    const saveRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ml_accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        account_id: accountId,
        account_name: accountName,
        ml_user_id: String(user_id),
        access_token,
        refresh_token,
        expires_in,
        connected: true,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!saveRes.ok) {
      console.error('Erro Supabase:', await saveRes.text());
      return res.redirect(`/?ml_error=supabase_falhou&account=${accountId}`);
    }

    return res.redirect(`/?ml_connected=true&account=${accountId}`);

  } catch (error) {
    console.error('Erro callback:', error);
    return res.redirect(`/?ml_error=erro_interno&account=${accountId}`);
  }
}
