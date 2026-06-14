// api/accounts.js
// ─────────────────────────────────────────────────────────────
// Retorna o status de todas as 4 contas para o frontend
// popular o seletor e mostrar quais estão conectadas.
//
// NÃO expõe tokens — apenas status e informações públicas.
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.SUPABASE_URL           || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY   || '').trim();

// Nomes fixos das 4 contas (fallback caso não tenha no banco)
const ACCOUNT_DEFAULTS = [
  { account_id: 'acc_1', account_name: 'Urso Forte' },
  { account_id: 'acc_2', account_name: 'TecService' },
  { account_id: 'acc_3', account_name: 'Ice'        },
  { account_id: 'acc_4', account_name: 'Breno'      },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET.' });
  }

  try {
    // Lê status das 4 contas via VIEW segura (sem tokens)
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ml_accounts_status?select=account_id,account_name,ml_user_id,connected,updated_at,token_status`,
      {
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!dbRes.ok) {
      throw new Error(`Supabase error: ${await dbRes.text()}`);
    }

    const rows = await dbRes.json();

    // Garante que todas as 4 contas aparecem no resultado,
    // mesmo que ainda não tenham linha no banco
    const accounts = ACCOUNT_DEFAULTS.map(def => {
      const saved = rows.find(r => r.account_id === def.account_id);
      return {
        account_id:   def.account_id,
        account_name: saved?.account_name || def.account_name,
        ml_user_id:   saved?.ml_user_id   || null,
        connected:    saved?.connected     || false,
        token_status: saved?.token_status  || 'disconnected',
        updated_at:   saved?.updated_at    || null,
      };
    });

    return res.status(200).json({ accounts });

  } catch (error) {
    console.error('[accounts] Erro:', error);

    // Fallback: devolve as 4 contas desconectadas
    return res.status(200).json({
      accounts: ACCOUNT_DEFAULTS.map(d => ({
        ...d,
        ml_user_id:   null,
        connected:    false,
        token_status: 'disconnected',
        updated_at:   null,
      })),
      warning: 'Não foi possível ler status do banco.',
    });
  }
}
