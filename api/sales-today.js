// api/sales-today.js
// ─────────────────────────────────────────────────────────────
// BACKEND do painel "Vendas de hoje" (tempo real).
// ATENÇÃO: o arquivo anterior nesta pasta era o código de
// FRONTEND enviado por engano — por isso a função quebrava com
// "No exports found in module" (erro 500 FUNCTION_INVOCATION_FAILED).
//
// Retorna o formato que o js/sales-today.js do frontend espera:
// { today: {count, units, revenue, fees, net}, sales: [...], paused: {...} }
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

export default async function handler(req, res) {
  const { account_id } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  try {
    const accessToken = await getTokenForAccount(account_id);

    if (!accessToken) {
      return res.status(401).json({
        error: 'Conta não conectada.',
        not_connected: true,
        account_id,
      });
    }

    // Usuário ML
    const userRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return res.status(401).json({
          error: 'Token inválido. Reconecte a conta.',
          not_connected: true,
          account_id,
        });
      }
      throw new Error(`ML /users/me error: ${userRes.status}`);
    }

    const user = await userRes.json();
    const mlUserId = user.id;

    // "Hoje" no fuso de Brasília (-03:00)
    const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const day = brt.toISOString().split('T')[0];
    const from = `${day}T00:00:00.000-03:00`;
    const to   = `${day}T23:59:59.999-03:00`;

    // Pedidos pagos de hoje (mais recentes primeiro)
    const ordersRes = await fetch(
      `https://api.mercadolibre.com/orders/search?seller=${mlUserId}` +
      `&order.status=paid&order.date_created.from=${from}&order.date_created.to=${to}` +
      `&sort=date_desc&limit=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const ordersData = await ordersRes.json();
    const orders = ordersData.results || [];

    let revenue = 0, fees = 0, units = 0;
    const itemIds = new Set();

    orders.forEach(o => {
      revenue += o.total_amount || 0;
      (o.order_items || []).forEach(oi => {
        units += oi.quantity || 0;
        fees  += (oi.sale_fee || 0) * (oi.quantity || 0);
        if (oi.item?.id) itemIds.add(oi.item.id);
      });
    });

    // Estoque atual dos itens vendidos hoje
    const stockMap = {};
    if (itemIds.size > 0) {
      const ids = [...itemIds].slice(0, 20).join(',');
      const itRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${ids}&attributes=id,available_quantity`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (itRes.ok) {
        const d = await itRes.json();
        d.forEach(x => { if (x.body) stockMap[x.body.id] = x.body.available_quantity; });
      }
    }

    const sales = orders.map(o => ({
      time:    o.date_created,
      product: o.order_items?.[0]?.item?.title || '—',
      units:   (o.order_items || []).reduce((s, oi) => s + (oi.quantity || 0), 0),
      amount:  o.total_amount || 0,
      stock:   stockMap[o.order_items?.[0]?.item?.id] ?? null,
    }));

    // Anúncios pausados
    const paused = { count: 0, items: [] };
    const pausedRes = await fetch(
      `https://api.mercadolibre.com/users/${mlUserId}/items/search?status=paused&limit=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (pausedRes.ok) {
      const pd = await pausedRes.json();
      paused.count = pd.paging?.total ?? (pd.results || []).length;
      const pids = (pd.results || []).slice(0, 10);
      if (pids.length > 0) {
        const dRes = await fetch(
          `https://api.mercadolibre.com/items?ids=${pids.join(',')}&attributes=id,title,available_quantity`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (dRes.ok) {
          const dd = await dRes.json();
          paused.items = dd
            .map(x => x.body)
            .filter(Boolean)
            .map(b => ({ title: b.title, stock: b.available_quantity ?? 0 }));
        }
      }
    }

    return res.status(200).json({
      account_id,
      ml_user_id: mlUserId,
      today: {
        count:   ordersData.paging?.total ?? orders.length,
        units,
        revenue,
        fees,
        net: revenue - fees,
      },
      sales,
      paused,
    });

  } catch (error) {
    console.error(`[sales-today] Erro para ${account_id}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar vendas de hoje.' });
  }
}
