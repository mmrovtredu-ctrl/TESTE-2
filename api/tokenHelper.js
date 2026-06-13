// api/_tokenHelper.js
// Funções reutilizáveis de token para todos os endpoints da API.
// Cole este arquivo em: api/_tokenHelper.js
//
// USO em qualquer api/*.js:
//   import { getAccountToken, ensureFreshToken } from './_tokenHelper.js';

/**
 * Busca o token da conta no Supabase.
 * @param {string} accountId
 * @returns {Promise<object|null>}
 */
export async function getAccountToken(accountId) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}&select=access_token,refresh_token,expires_in,updated_at&connected=eq.true`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}

/**
 * Garante que o access_token está válido, fazendo refresh se necessário.
 * @param {object} token  - objeto retornado por getAccountToken()
 * @param {string} accountId
 * @returns {Promise<string>} access_token válido
 */
export async function ensureFreshToken(token, accountId) {
  const updatedAt = new Date(token.updated_at).getTime();
  const expiresMs = (token.expires_in || 21600) * 1000;
  const isExpired = Date.now() > updatedAt + expiresMs - 5 * 60 * 1000;

  if (!isExpired) return token.access_token;

  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: token.refresh_token,
    }),
  });

  if (!refreshRes.ok) return token.access_token;

  const refreshData = await refreshRes.json();

  await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_in: refreshData.expires_in,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  return refreshData.access_token;
}
