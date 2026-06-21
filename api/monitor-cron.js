// api/monitor-cron.js
// ─────────────────────────────────────────────────────────────
// Cron de monitoramento de concorrentes — roda a cada 2 horas.
// Configurar no vercel.json:
//   "crons": [{ "path": "/api/monitor-cron", "schedule": "0 */2 * * *" }]
//
// Fluxo por conta conectada:
//   1. Busca até 30 produtos do catálogo
//   2. Para cada produto, busca os top-3 concorrentes no ML
//   3. Compara com o último snapshot salvo no Supabase
//   4. Gera alertas para: queda de preço, sem estoque, voltou ao estoque
//   5. Salva novo snapshot e atualiza monitor_status
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim();
const ACCOUNT_IDS  = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];
const CRON_SECRET  = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Proteção básica: só aceita GET com o secret correto (ou chamada interna da Vercel)
  if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const results = [];

  for (const accountId of ACCOUNT_IDS) {
    try {
      const summary = await monitorAccount(accountId);
      results.push({ accountId, ...summary });
    } catch (err) {
      console.error(`[monitor-cron] Erro na conta ${accountId}:`, err.message);
      results.push({ accountId, error: err.message });
    }
  }

  return res.status(200).json({ ran_at: new Date().toISOString(), results });
}

async function monitorAccount(accountId) {
  const accessToken = await getTokenForAccount(accountId);
  if (!accessToken) return { skipped: true, reason: 'não conectada' };

  // Busca usuário ML
  const userRes = await fetch('https://api.mercadolibre.com/users/me',
    { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!userRes.ok) return { skipped: true, reason: `users/me ${userRes.status}` };
  const { id: mlUserId } = await userRes.json();

  // Busca até 30 produtos ativos do catálogo
  const itemsRes = await fetch(
    `https://api.mercadolibre.com/users/${mlUserId}/items/search?status=active&limit=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const itemsData = await itemsRes.json();
  const itemIds   = itemsData.results || [];

  if (itemIds.length === 0) return { products: 0, alerts: 0 };

  // Detalhes dos produtos (preço e título)
  const detailRes = await fetch(
    `https://api.mercadolibre.com/items?ids=${itemIds.slice(0, 20).join(',')}&attributes=id,title,price,category_id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const detailData = await detailRes.json();
  const myItems    = detailData.map(d => d.body).filter(Boolean);

  let totalAlerts       = 0;
  let competitorsTracked = 0;

  for (const myItem of myItems) {
    try {
      const alerts = await checkItemCompetitors(accountId, myItem, accessToken);
      totalAlerts += alerts;
      competitorsTracked++;
    } catch (err) {
      console.warn(`[monitor-cron] Falha ao checar item ${myItem.id}:`, err.message);
    }
  }

  // Atualiza monitor_status
  const nextCheck = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await supabasePatch(`/rest/v1/monitor_status?account_id=eq.${accountId}`, {
    last_check_at:       new Date().toISOString(),
    next_check_at:       nextCheck.toISOString(),
    products_monitored:  myItems.length,
    competitors_tracked: competitorsTracked,
    alerts_last_24h:     await countAlertsLast24h(accountId),
    updated_at:          new Date().toISOString(),
  }, 'POST', true);

  return { products: myItems.length, alerts: totalAlerts };
}

async function checkItemCompetitors(accountId, myItem, accessToken) {
  // Busca concorrentes para o mesmo produto (por categoria + título abreviado)
  const query = myItem.title.split(' ').slice(0, 5).join(' ');
  const searchRes = await fetch(
    `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&category=${myItem.category_id}&limit=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!searchRes.ok) return 0;
  const searchData = await searchRes.json();
  const competitors = (searchData.results || []).filter(r => r.id !== myItem.id).slice(0, 3);

  if (competitors.length === 0) return 0;

  let alertsGenerated = 0;

  for (const comp of competitors) {
    const compId     = comp.seller?.id?.toString() || comp.id;
    const compName   = comp.seller?.nickname || comp.id;
    const currPrice  = comp.price;
    const currStock  = comp.available_quantity ?? null;

    // Busca último snapshot para este par (item, concorrente)
    const lastSnap = await getLastSnapshot(accountId, myItem.id, compId);

    // Salva novo snapshot
    await supabasePost('/rest/v1/competitor_snapshots', {
      account_id:      accountId,
      item_id:         myItem.id,
      competitor_id:   compId,
      competitor_name: compName,
      price:           currPrice,
      stock:           currStock,
      checked_at:      new Date().toISOString(),
    });

    if (!lastSnap) continue; // primeira verificação, sem histórico para comparar

    const prevPrice = lastSnap.price;
    const prevStock = lastSnap.stock;

    // Alerta: concorrente ficou mais barato que nosso produto
    if (currPrice !== null && prevPrice !== null && currPrice < prevPrice && currPrice < myItem.price) {
      await insertAlert({
        account_id:     accountId,
        item_id:        myItem.id,
        product_name:   myItem.title,
        competitor:     compName,
        type:           'price_drop',
        severity:       currPrice < myItem.price * 0.9 ? 'alta' : 'media',
        message:        `${compName} reduziu o preço de ${fmtBrl(prevPrice)} para ${fmtBrl(currPrice)}. Seu preço: ${fmtBrl(myItem.price)}.`,
        previous_value: prevPrice,
        current_value:  currPrice,
        your_price:     myItem.price,
      });
      alertsGenerated++;
    }

    // Alerta: concorrente ficou sem estoque
    if (prevStock > 0 && currStock === 0) {
      await insertAlert({
        account_id:     accountId,
        item_id:        myItem.id,
        product_name:   myItem.title,
        competitor:     compName,
        type:           'out_of_stock',
        severity:       'baixa',
        message:        `${compName} ficou sem estoque. Oportunidade de capturar mais vendas.`,
        previous_value: prevStock,
        current_value:  0,
        your_price:     myItem.price,
      });
      alertsGenerated++;
    }

    // Alerta: concorrente voltou ao estoque
    if (prevStock === 0 && currStock > 0) {
      await insertAlert({
        account_id:     accountId,
        item_id:        myItem.id,
        product_name:   myItem.title,
        competitor:     compName,
        type:           'back_in_stock',
        severity:       'media',
        message:        `${compName} voltou ao estoque com ${currStock} unidades.`,
        previous_value: 0,
        current_value:  currStock,
        your_price:     myItem.price,
      });
      alertsGenerated++;
    }
  }

  return alertsGenerated;
}

async function getLastSnapshot(accountId, itemId, competitorId) {
  const res = await supabaseGet(
    `/rest/v1/competitor_snapshots` +
    `?account_id=eq.${accountId}` +
    `&item_id=eq.${itemId}` +
    `&competitor_id=eq.${competitorId}` +
    `&order=checked_at.desc&limit=1`
  );
  return res?.[0] || null;
}

async function insertAlert(data) {
  await supabasePost('/rest/v1/monitor_alerts', {
    ...data,
    checked_at: new Date().toISOString(),
    unread:     true,
  });
}

async function countAlertsLast24h(accountId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await supabaseGet(
    `/rest/v1/monitor_alerts?account_id=eq.${accountId}&checked_at=gte.${since}&select=id`
  );
  return (res || []).length;
}

// ── Helpers Supabase ──────────────────────────────────────────

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function supabasePost(path, data) {
  await fetch(`${SUPABASE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey:          SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      Prefer:         'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
}

async function supabasePatch(path, data, method = 'PATCH', upsert = false) {
  await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey:          SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      ...(upsert ? { Prefer: 'resolution=merge-duplicates' } : {}),
    },
    body: JSON.stringify(data),
  });
}

function fmtBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
