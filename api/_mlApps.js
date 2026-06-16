// api/_mlApps.js
// ─────────────────────────────────────────────────────────────
// Mapa central das credenciais de aplicativo do Mercado Livre.
// Cada conta (acc_1..acc_4) tem o SEU PRÓPRIO app no ML, com
// client_id e client_secret próprios.
//
// As credenciais vêm das variáveis de ambiente na Vercel:
//   ML_CLIENT_ID_ACC1 / ML_CLIENT_SECRET_ACC1  → Urso Forte
//   ML_CLIENT_ID_ACC2 / ML_CLIENT_SECRET_ACC2  → TecService
//   ML_CLIENT_ID_ACC3 / ML_CLIENT_SECRET_ACC3  → Ice
//   ML_CLIENT_ID_ACC4 / ML_CLIENT_SECRET_ACC4  → Breno
//
// A redirect URI é a MESMA para todos (ML_REDIRECT_URI).
// ─────────────────────────────────────────────────────────────

const APP_BY_ACCOUNT = {
  acc_1: {
    clientId:     (process.env.ML_CLIENT_ID_ACC1     || '').trim(),
    clientSecret: (process.env.ML_CLIENT_SECRET_ACC1 || '').trim(),
  },
  acc_2: {
    clientId:     (process.env.ML_CLIENT_ID_ACC2     || '').trim(),
    clientSecret: (process.env.ML_CLIENT_SECRET_ACC2 || '').trim(),
  },
  acc_3: {
    clientId:     (process.env.ML_CLIENT_ID_ACC3     || '').trim(),
    clientSecret: (process.env.ML_CLIENT_SECRET_ACC3 || '').trim(),
  },
  acc_4: {
    clientId:     (process.env.ML_CLIENT_ID_ACC4     || '').trim(),
    clientSecret: (process.env.ML_CLIENT_SECRET_ACC4 || '').trim(),
  },
};

export const VALID_ACCOUNTS = Object.keys(APP_BY_ACCOUNT);

export const ML_REDIRECT_URI = (process.env.ML_REDIRECT_URI || '').trim();

// Retorna { clientId, clientSecret } da conta, ou null se a conta
// for inválida ou as credenciais não estiverem configuradas.
export function getAppCredentials(accountId) {
  const app = APP_BY_ACCOUNT[accountId];
  if (!app || !app.clientId || !app.clientSecret) return null;
  return app;
}
