// api/connect.js
// ─────────────────────────────────────────────────────────────
// Gera a URL de autorização OAuth do ML para a conta selecionada,
// usando o APP ESPECÍFICO daquela conta (1 app por conta).
// ─────────────────────────────────────────────────────────────

import { getAppCredentials, ML_REDIRECT_URI, VALID_ACCOUNTS } from './_mlApps.js';

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

  if (!ML_REDIRECT_URI) {
    return res.status(500).json({ error: 'ML_REDIRECT_URI não configurado.' });
  }

  // O `state` carrega qual conta está sendo conectada (codificado UMA vez)
  const state = encodeURIComponent(JSON.stringify({
    account_id,
    account_name: account_name || account_id,
  }));

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', app.clientId);
  authUrl.searchParams.set('redirect_uri', ML_REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  return res.redirect(authUrl.toString());
}
