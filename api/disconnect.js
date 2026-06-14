// api/disconnect.js
// ─────────────────────────────────────────────────────────────
// Desconecta uma conta ML: limpa os tokens no Supabase sem
// apagar o registro (a conta permanece no seletor, pronta
// para ser reconectada com um novo OAuth).
// ─────────────────────────────────────────────────────────────

import { disconnectAccount } from './_tokenHelper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  const { account_id } = req.body;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  const validAccounts = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];
  if (!validAccounts.includes(account_id)) {
    return res.status(400).json({ error: `account_id inválido: ${account_id}` });
  }

  try {
    await disconnectAccount(account_id);
    console.log(`[disconnect] Conta ${account_id} desconectada.`);
    return res.status(200).json({ ok: true, account_id });
  } catch (error) {
    console.error(`[disconnect] Erro ao desconectar ${account_id}:`, error);
    return res.status(500).json({ error: 'Erro ao desconectar conta.' });
  }
}
