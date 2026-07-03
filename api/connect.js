// api/connect.js  (CORRIGIDO)
// ─────────────────────────────────────────────────────────────
// Gera a URL de autorização OAuth do ML para a conta selecionada.
//
// CORREÇÕES:
// 1. O redirect agora aponta para o PRÓPRIO dashboard
//    (https://<host>/api/oauth-callback) em vez de um site externo
//    (antes: https://luarco.com/code.html, cujo endpoint de troca
//    de código foi deletado — o fluxo estava quebrado).
//    Se ML_REDIRECT_URI estiver definido E apontar para /api/oauth-callback,
//    ele é usado; caso contrário é derivado do host da requisição.
// 2. O state não é mais codificado duas vezes (o URL.searchParams
//    já codifica; o encodeURIComponent extra corrompia o valor).
//
// IMPORTANTE: cadastre esta URL como Redirect URI nos 4 aplicativos
// no DevCenter do Mercado Livre:
//   https://teste-2-ashy.vercel.app/api/oauth-callback
// ─────────────────────────────────────────────────────────────

import { getAppCredentials, ML_REDIRECT_URI, VALID_ACCOUNTS } from './_mlApps.js';

export function resolveRedirectUri(req) {
  // Usa a env apenas se já estiver apontando para o callback correto
  if (ML_REDIRECT_URI && ML_REDIRECT_URI.includes('/api/oauth-callback')) {
    return ML_REDIRECT_URI;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}/api/oauth-callback`;
}

export default async function handler(req, res) {
  const { account_id, account_name } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  if (!VALID_ACCOUNTS.includes(account_id)) {
    return res.status(400).json({ error: `account_id inválido: ${account_id}` });
  }

  const app = getAppCredentials(account_id);
  if (!app) {
    return res.status(500).json({
      error: `Credenciais do app não configuradas para ${account_id}. ` +
             `Verifique ML_CLIENT_ID_/ML_CLIENT_SECRET_ na Vercel.`,
    });
  }

  const redirectUri = resolveRedirectUri(req);

  // O `state` carrega qual conta está sendo conectada.
  // Sem encodeURIComponent aqui — o searchParams.set já codifica.
  const state = JSON.stringify({
    account_id,
    account_name: account_name || account_id,
  });

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', app.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return res.redirect(authUrl.toString());
}
