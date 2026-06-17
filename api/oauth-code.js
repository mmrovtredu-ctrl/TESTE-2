// api/oauth-code.js
// ─────────────────────────────────────────────────────────────
// Página de RETORNO do login do Mercado Livre (redirect_uri).
// Quando o ML te redireciona com ?code=TG-xxxx, esta página LÊ
// e MOSTRA esse código (o "TG") na tela, com botão de copiar.
//
// BÔNUS: se você configurar as variáveis de ambiente
//   ML_CLIENT_ID  e  ML_CLIENT_SECRET
// na Vercel, a página JÁ TROCA o código pelo token e mostra o
// user_id (ML User ID), access_token e refresh_token — sem Postman.
//
// COMO USAR:
//  1) Cadastre esta URL como redirect_uri no seu app do ML:
//        https://SEU-SITE.vercel.app/api/oauth-code
//  2) Abra (logado na conta desejada):
//        https://auth.mercadolivre.com.br/authorization?response_type=code
//          &client_id=SEU_APP_ID
//          &redirect_uri=https://SEU-SITE.vercel.app/api/oauth-code
//  3) Autorize. O ML volta pra cá e mostra o TG (e o user_id, se
//     as variáveis acima estiverem configuradas).
// ─────────────────────────────────────────────────────────────

const ML = 'https://api.mercadolibre.com';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Retorno do login Mercado Livre</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b1620;color:#e6eef6;margin:0;padding:24px;}
  h1{font-size:1.15rem;margin:0 0 16px;}
  .card{max-width:680px;background:#101f2e;border:1px solid #213548;border-radius:12px;padding:18px 20px;margin-bottom:16px;}
  .label{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#8fa3b8;margin:0 0 6px;}
  .val{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;word-break:break-all;background:#0b1620;border:1px solid #213548;border-radius:8px;padding:10px 12px;color:#ffb454;}
  button{margin-top:8px;background:#ffb454;color:#0b1620;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:.85rem;}
  .ok{color:#5fd9a4;} .bad{color:#ff7a7a;}
  .hint{color:#5d7186;font-size:.82rem;max-width:680px;line-height:1.5;}
  a{color:#5fb3d9;}
</style></head>
<body>${bodyHtml}
<script>
  function copiar(id, btn){
    const el=document.getElementById(id);
    navigator.clipboard.writeText(el.textContent.trim()).then(()=>{
      const t=btn.textContent; btn.textContent='Copiado!'; setTimeout(()=>btn.textContent=t,1500);
    });
  }
</script>
</body></html>`;
}

function field(label, value, id) {
  return `<p class="label">${esc(label)}</p>
    <div class="val" id="${id}">${esc(value)}</div>
    <button onclick="copiar('${id}', this)">Copiar</button>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const code  = req.query.code || '';
  const error = req.query.error || '';

  // Erro vindo do ML (usuário negou, etc.)
  if (error) {
    return res.status(200).send(page(`
      <h1 class="bad">O Mercado Livre retornou um erro</h1>
      <div class="card">${field('Erro', error, 'err')}
        ${req.query.error_description ? field('Detalhe', req.query.error_description, 'errd') : ''}
      </div>
      <p class="hint">Tente abrir o link de autorização de novo, logado na conta certa.</p>`));
  }

  // Sem code: explica como chegar aqui
  if (!code) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'SEU-SITE.vercel.app';
    const redirect = `https://${host}/api/oauth-code`;
    return res.status(200).send(page(`
      <h1>Página de retorno do login do Mercado Livre</h1>
      <div class="card">
        <p class="label">Sua redirect_uri (cadastre esta no app do ML)</p>
        <div class="val" id="ru">${esc(redirect)}</div>
        <button onclick="copiar('ru', this)">Copiar</button>
      </div>
      <p class="hint">
        1) No seu app em developers.mercadolivre.com.br, coloque a URL acima como redirect_uri.<br>
        2) Logado na conta desejada, abra:<br>
        <code>https://auth.mercadolivre.com.br/authorization?response_type=code&amp;client_id=SEU_APP_ID&amp;redirect_uri=${esc(redirect)}</code><br>
        3) Autorize. O ML volta pra cá e mostra o código TG (e o user_id, se as variáveis ML_CLIENT_ID e ML_CLIENT_SECRET estiverem na Vercel).
      </p>`));
  }

  // Temos o code (TG). Sempre mostramos ele.
  let blocks = `<h1 class="ok">Código recebido!</h1>
    <div class="card">${field('Código de autorização (TG)', code, 'tg')}</div>`;

  // Se as credenciais estiverem no ambiente, já troca pelo token.
  const clientId = (process.env.ML_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET || '').trim();

  if (clientId && clientSecret) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = (process.env.ML_REDIRECT_URI || `https://${host}/api/oauth-code`).trim();

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      const r = await fetch(`${ML}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      });
      const data = await r.json();

      if (r.ok && data.user_id) {
        blocks += `
          <div class="card">
            ${field('ML User ID', data.user_id, 'uid')}
          </div>
          <div class="card">
            ${field('access_token', data.access_token || '', 'at')}
            <div style="height:12px"></div>
            ${field('refresh_token', data.refresh_token || '', 'rt')}
            <p class="hint" style="margin-top:10px">expira em ${esc(data.expires_in || '?')} segundos</p>
          </div>`;
      } else {
        blocks += `<div class="card"><p class="label bad">Não consegui trocar o código pelo token</p>
          <div class="val">${esc(JSON.stringify(data))}</div>
          <p class="hint" style="margin-top:10px">Confira se a redirect_uri usada no login é EXATAMENTE: ${esc(redirectUri)}</p></div>`;
      }
    } catch (e) {
      blocks += `<div class="card"><p class="label bad">Erro de conexão ao trocar o token</p>
        <div class="val">${esc(e.message || 'desconhecido')}</div></div>`;
    }
  } else {
    blocks += `<p class="hint">
      Para já ver o <strong>user_id</strong> aqui (sem Postman), adicione na Vercel as variáveis
      <code>ML_CLIENT_ID</code> e <code>ML_CLIENT_SECRET</code> e abra o login de novo.<br>
      Sem elas, copie o TG acima e troque pelo token no Postman.</p>`;
  }

  return res.status(200).send(page(blocks));
}
