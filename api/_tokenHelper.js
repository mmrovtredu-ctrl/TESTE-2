// api/_tokenHelper.js
// ─────────────────────────────────────────────────────────────
// Funções de autenticação para os tokens ML.
// AGORA MULTI-APP: cada conta renova o token com o SEU app.
// ─────────────────────────────────────────────────────────────

import { getAppCredentials } from './_mlApps.js';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim();

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
export async function ensureFreshToken(token, accountId) {
  if (!token?.access_token) return null;

  const updatedAt = new Date(token.updated_at).getTime();
  const expiresMs = (token.expires_in || 21600) * 1000;
  const marginMs  = 5 * 60 * 1000; // 5 minutos de margem
  const isExpired = Date.now() > updatedAt + expiresMs - marginMs;

  if (!isExpired) return token.access_token;

  // Precisa do app DESTA conta para renovar
  const app = getAppCredentials(accountId);
  if (!app) {
    console.error(`[tokenHelper] Sem credenciais de app para ${accountId}.`);
    return token.access_token;
  }

  console.log(`[tokenHelper] Renovando token para ${accountId}…`);

  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     app.clientId,
      client_secret: app.clientSecret,
      refresh_token: token.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    const err = await refreshRes.json().catch(() => ({}));
    console.error(`[tokenHelper] Refresh falhou para ${accountId}:`, err);
    return token.access_token;
  }

  const refreshData = await refreshRes.json();

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
