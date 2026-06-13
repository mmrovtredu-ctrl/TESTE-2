// api/connect.js
// Gera a URL de autorização OAuth do ML para a conta selecionada

export default async function handler(req, res) {
  const { account_id, account_name } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', process.env.ML_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', process.env.ML_REDIRECT_URI);
  authUrl.searchParams.set('state', JSON.stringify({
    account_id,
    account_name: account_name || account_id
  }));

  return res.redirect(authUrl.toString());
}
