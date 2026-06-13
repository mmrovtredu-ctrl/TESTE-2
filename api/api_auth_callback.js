// api/auth/callback.js
// Recebe o code do OAuth do Mercado Livre e troca por access_token

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Código de autorização não encontrado.' });
  }

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ML_REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro ao trocar code por token:', data);
      return res.status(500).json({ error: 'Falha na autenticação com o Mercado Livre.', details: data });
    }

    // Aqui você pode salvar o access_token e refresh_token no Supabase
    // Por ora, retornamos pro front-end tratar
    // data contém: access_token, token_type, expires_in, scope, user_id, refresh_token
    console.log('Token obtido com sucesso para user_id:', data.user_id);

    // Redireciona de volta pro dashboard com token na URL (temporário)
    // Ideal: salvar no Supabase e redirecionar limpo
    return res.redirect(`/?ml_connected=true&ml_user_id=${data.user_id}`);

  } catch (error) {
    console.error('Erro no callback OAuth:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}
