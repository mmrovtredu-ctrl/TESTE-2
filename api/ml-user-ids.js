// api/ml-user-ids.js
// ─────────────────────────────────────────────────────────────
// Mostra o ML User ID (número do vendedor no Mercado Livre) de
// cada conta conectada. Basta abrir no navegador:
//
//   https://SEU-SITE.vercel.app/api/ml-user-ids
//
// Para receber em JSON (em vez da tabela):
//   https://SEU-SITE.vercel.app/api/ml-user-ids?format=json
//
// Para uma conta só:
//   https://SEU-SITE.vercel.app/api/ml-user-ids?account_id=acc_1
//
// Usa o token de cada conta e chama GET /users/me na API do ML.
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const ML = 'https://api.mercadolibre.com';

// Suas 4 contas. Os apelidos abaixo são só para te ajudar a
// identificar — o ML User ID e o nickname reais vêm da API.
const ACCOUNTS = [
  { account_id: 'acc_1', apelido: 'Urso Forte' },
  { account_id: 'acc_2', apelido: 'TecService' },
  { account_id: 'acc_3', apelido: 'Ice' },
  { account_id: 'acc_4', apelido: 'Breno' },
];

async function mlGet(url, token) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: 200, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function resolveAccount(acc) {
  let token = null;
  try { token = await getTokenForAccount(acc.account_id); } catch { token = null; }

  if (!token) {
    return { ...acc, connected: false, ml_user_id: null, nickname: null, note: 'não conectada' };
  }

  const me = await mlGet(`${ML}/users/me`, token);
  if (!me.ok || !me.data?.id) {
    return { ...acc, connected: true, ml_user_id: null, nickname: null, note: 'token inválido/expirado' };
  }

  return {
    ...acc,
    connected: true,
    ml_user_id: me.data.id,
    nickname: me.data.nickname || null,
    note: 'ok',
  };
}

function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHtml(rows) {
  const trs = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.account_id)}</td>
      <td>${escapeHtml(r.apelido)}</td>
      <td>${escapeHtml(r.nickname || '—')}</td>
      <td class="id">${r.ml_user_id != null
        ? `<strong>${escapeHtml(r.ml_user_id)}</strong>`
        : `<span class="muted">${escapeHtml(r.note)}</span>`}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ML User IDs das contas</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b1620;color:#e6eef6;margin:0;padding:24px;}
  h1{font-size:1.2rem;margin:0 0 4px;}
  p{color:#8fa3b8;margin:0 0 18px;font-size:.9rem;}
  table{width:100%;border-collapse:collapse;max-width:640px;background:#101f2e;border:1px solid #213548;border-radius:10px;overflow:hidden;}
  th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #213548;font-size:.92rem;}
  th{background:#16273a;color:#8fa3b8;text-transform:uppercase;font-size:.72rem;letter-spacing:.05em;}
  tr:last-child td{border-bottom:none;}
  td.id strong{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.05rem;color:#ffb454;}
  .muted{color:#ff7a7a;font-size:.85rem;}
  .hint{margin-top:14px;font-size:.8rem;color:#5d7186;max-width:640px;}
</style></head>
<body>
  <h1>ML User ID das suas contas</h1>
  <p>O número em destaque é o ID do vendedor no Mercado Livre.</p>
  <table>
    <thead><tr><th>Conta</th><th>Apelido</th><th>Nickname (ML)</th><th>ML User ID</th></tr></thead>
    <tbody>${trs}</tbody>
  </table>
  <p class="hint">Se aparecer "não conectada" ou "token inválido", reconecte essa conta no painel e abra esta página de novo.</p>
</body></html>`;
}

export default async function handler(req, res) {
  const only = req.query.account_id;
  const list = only ? ACCOUNTS.filter(a => a.account_id === only) : ACCOUNTS;

  const rows = await Promise.all(list.map(resolveAccount));

  if (req.query.format === 'json') {
    return res.status(200).json({ ok: true, accounts: rows });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderHtml(rows));
}
