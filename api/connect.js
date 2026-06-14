// api/connect.js
// ─────────────────────────────────────────────────────────────
// Gera a URL de autorização OAuth do ML para a conta selecionada.
//
// FLUXO:
// 1. Frontend chama GET /api/connect?account_id=acc_1&account_name=Urso+Forte
// 2. Este endpoint redireciona para auth.mercadolivre.com.br
// 3. O usuário loga no ML e autoriza o app
// 4. O ML redireciona para /api/auth/callback?code=XXX&state=...
// 5. O callback troca o code pelo token e salva no Supabase
//
// O parâmetro `state` carrega o account_id para o callback saber
// qual das 4 contas está sendo conectada.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { account_id, account_name } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  // Valida que account_id é uma das 4 contas aceitas
  const validAccounts = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];
  if (!validAccounts.includes(account_id)) {
    return res.status(400).json({ error: `account_id inválido: ${account_id}` });
  }

  const clientId    = (process.env.ML_CLIENT_ID     || '').trim();
  const redirectUri = (process.env.ML_REDIRECT_URI  || '').trim();

  if (!clientId) {
    return res.status(500).json({ error: 'ML_CLIENT_ID não configurado.' });
  }
  if (!redirectUri) {
    return res.status(500).json({ error: 'ML_REDIRECT_URI não configurado.' });
  }

  // O `state` será devolvido pelo ML no callback — usamos para saber
  // qual conta está sendo conectada
  const state = encodeURIComponent(JSON.stringify({
    account_id,
    account_name: account_name || account_id,
  }));

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return res.redirect(authUrl.toString());
}
