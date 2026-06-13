// api/connect.js
// Gera a URL de autorização OAuth do ML para a conta selecionada

export default async function handler(req, res) {
  const { account_id, account_name } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  // .trim() em todas as variáveis para remover \n ou espaços acidentais
  const clientId     = (process.env.ML_CLIENT_ID     || '').trim();
  const redirectUri  = (process.env.ML_REDIRECT_URI  || '').trim();

  if (!clientId) {
    return res.status(500).json({ error: 'ML_CLIENT_ID não configurado na Vercel.' });
  }

  if (!redirectUri) {
    return res.status(500).json({ error: 'ML_REDIRECT_URI não configurado na Vercel.' });
  }

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', JSON.stringify({
    account_id,
    account_name: account_name || account_id
  }));

  return res.redirect(authUrl.toString());
}
