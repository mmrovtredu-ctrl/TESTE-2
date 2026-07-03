// api/oauth-callback.js
// ─────────────────────────────────────────────────────────────
// NOVO endpoint: recebe o retorno do OAuth do Mercado Livre,
// troca o código pelo token e salva no Supabase.
//
// Antes o fluxo estava QUEBRADO: o redirect apontava para
// https://luarco.com/code.html (site externo) e o endpoint que
// trocava o código (api/oauth-code.js) tinha sido deletado.
//
// IMPORTANTE: cadastre esta URL como Redirect URI nos 4 aplicativos
// no DevCenter do Mercado Livre:
//   https://teste-2-ashy.vercel.app/api/oauth-callback
// ─────────────────────────────────────────────────────────────

import { getAppCredentials, ML_REDIRECT_URI, VALID_ACCOUNTS } from './_mlApps.js';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim();

// Mesma lógica do connect.js: a redirect_uri da troca de token
// precisa ser EXATAMENTE a mesma usada na autorização.
function resolveRedirectUri(req) {
  if (ML_REDIRECT_URI && ML_REDIRECT_URI.includes('/api/oauth-callback')) {
    return ML_REDIRECT_URI;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}/api/oauth-callback`;
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) return res.redirect('/?ml_error=oauth_cancelado');
  if (!code) return res.redirect('/?ml_error=sem_codigo');

  // O state pode chegar codificado 0, 1 ou 2 vezes dependendo da
  // versão do connect.js. Decodifica até virar JSON.
  let accountId = null;
  try {
    let s = state || '';
    for (let i = 0; i < 3 && s && !s.trim().startsWith('{'); i++) {
      s = decodeURIComponent(s);
    }
    accountId = JSON.parse(s).account_id;
  } catch {
    return res.redirect('/?ml_error=conta_invalida');
  }

  if (!VALID_ACCOUNTS.includes(accountId)) {
    return res.redirect('/?ml_error=conta_invalida');
  }

  const app = getAppCredentials(accountId);
  if (!app || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.redirect('/?ml_error=config_incompleta');
  }

  try {
    // Troca o código de autorização pelo token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     app.clientId,
        client_secret: app.clientSecret,
        code,
        redirect_uri:  resolveRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`[oauth-callback] Troca de token falhou para ${accountId}:`, err);
      return res.redirect('/?ml_error=token_falhou');
    }

    const t = await tokenRes.json();
    if (!t.access_token) return res.redirect('/?ml_error=token_vazio');

    // Salva no Supabase
    const sb = await fetch(
      `${SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          access_token:  t.access_token,
          refresh_token: t.refresh_token,
          expires_in:    t.expires_in,
          ml_user_id:    String(t.user_id),
          connected:     true,
          updated_at:    new Date().toISOString(),
        }),
      }
    );

    if (!sb.ok) {
      console.error(`[oauth-callback] Supabase falhou para ${accountId}:`, await sb.text());
      return res.redirect('/?ml_error=supabase_falhou');
    }

    console.log(`[oauth-callback] Conta ${accountId} conectada (ml_user_id=${t.user_id}).`);
    return res.redirect(`/?ml_connected=true&account=${accountId}`);

  } catch (e) {
    console.error(`[oauth-callback] Erro interno para ${accountId}:`, e);
    return res.redirect('/?ml_error=erro_interno');
  }
}
