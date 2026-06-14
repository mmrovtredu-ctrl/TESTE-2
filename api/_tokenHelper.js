// api/_tokenHelper.js
// ─────────────────────────────────────────────────────────────
// Funções reutilizáveis de autenticação para os 4 tokens ML.
//
// COMO FUNCIONA:
// Cada uma das 4 contas (acc_1..acc_4) tem seu próprio par
// access_token / refresh_token no Supabase.
// - getAccountToken()   → lê o token de uma conta
// - ensureFreshToken()  → renova automaticamente se estiver
//                         a menos de 5 min de expirar
// - getTokenForAccount()→ atalho: lê + renova em uma chamada
//
// USO em qualquer api/*.js:
//   import { getTokenForAccount } from './_tokenHelper.js';
//   const token = await getTokenForAccount(account_id);
//   if (!token) return res.status(401).json({ not_connected: true });
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim();
const ML_CLIENT_ID = process.env.ML_CLIENT_ID?.trim();
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET?.trim();

// ─── Busca dados do token da conta no Supabase ───────────────
export async function getAccountToken(accountId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados.');
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ml_accounts` +
    `?account_id=eq.${accountId}` +
    `&select=access_token,refresh_token,expires_in,updated_at,connected,account_name,ml_user_id` +
    `&connected=eq.true`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase getAccountToken error: ${err}`);
  }

  const data = await res.json();
  return data?.[0] || null;
}

// ─── Garante que o access_token está válido ──────────────────
// Se estiver a menos de 5 minutos de expirar, renova via
// refresh_token antes de devolver.
export async function ensureFreshToken(token, accountId) {
  if (!token?.access_token) return null;

  const updatedAt = new Date(token.updated_at).getTime();
  const expiresMs = (token.expires_in || 21600) * 1000;
  const marginMs  = 5 * 60 * 1000; // 5 minutos de margem
  const isExpired = Date.now() > updatedAt + expiresMs - marginMs;

  if (!isExpired) return token.access_token;

  // Token próximo de expirar — faz refresh
  console.log(`[tokenHelper] Renovando token para ${accountId}…`);

  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: token.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    const err = await refreshRes.json();
    console.error(`[tokenHelper] Refresh falhou para ${accountId}:`, err);
    // Devolve o token antigo — a chamada à API do ML vai falhar com 401
    // e o usuário vai precisar reconectar
    return token.access_token;
  }

  const refreshData = await refreshRes.json();

  // Persiste o novo token no Supabase
  await fetch(
    `${SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        access_token:  refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_in:    refreshData.expires_in,
        updated_at:    new Date().toISOString(),
      }),
    }
  );

  console.log(`[tokenHelper] Token renovado com sucesso para ${accountId}.`);
  return refreshData.access_token;
}

// ─── Atalho: lê + renova em uma chamada ──────────────────────
// Retorna null se a conta não estiver conectada.
// Retorna string (access_token válido) se OK.
export async function getTokenForAccount(accountId) {
  const token = await getAccountToken(accountId);
  if (!token) return null;
  return ensureFreshToken(token, accountId);
}

// ─── Desconecta uma conta (limpa tokens no Supabase) ─────────
export async function disconnectAccount(accountId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        access_token:  null,
        refresh_token: null,
        ml_user_id:    null,
        connected:     false,
        updated_at:    new Date().toISOString(),
      }),
    }
  );
}
