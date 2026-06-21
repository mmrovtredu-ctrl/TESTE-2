// api/overview.js
// ─────────────────────────────────────────────────────────────
// Busca dados reais da visão geral de uma das 4 contas ML.
// Usa getTokenForAccount() para renovar token automaticamente.
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

    // Dados do usuário ML
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

    // Janelas de tempo: 30 dias atuais e 30 dias anteriores (para calcular tendência)
    const now             = new Date();
    const d30ago          = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const d60ago          = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const dateFromCurrent  = d30ago.toISOString().split('T')[0] + 'T00:00:00.000-03:00';
    const dateToCurrent    = now.toISOString().split('T')[0]    + 'T23:59:59.000-03:00';
    const dateFromPrevious = d60ago.toISOString().split('T')[0] + 'T00:00:00.000-03:00';
    const dateToPrevious   = d30ago.toISOString().split('T')[0] + 'T23:59:59.000-03:00';

    const ordersBaseUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&order.status=paid`;

    // Busca pedidos (período atual), pedidos (período anterior) e visitas em paralelo
    const [ordersRes, ordersPrevRes, visitsRes] = await Promise.all([
      fetch(`${ordersBaseUrl}&order.date_created.from=${dateFromCurrent}&order.date_created.to=${dateToCurrent}&limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${ordersBaseUrl}&order.date_created.from=${dateFromPrevious}&order.date_created.to=${dateToPrevious}&limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`https://api.mercadolibre.com/users/${mlUserId}/items/visits?last_days=30`,
        { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);

    const ordersData     = await ordersRes.json();
    const ordersPrevData = await ordersPrevRes.json();
    const visitsData     = await visitsRes.json();

    // Período atual: totalSales vem do paging (correto mesmo com >50 pedidos).
    // totalRevenue precisa de paginação pois limit=50 truncaria vendedores com muitos pedidos.
    const orders        = ordersData.results || [];
    const totalSales    = ordersData.paging?.total ?? orders.length;
    const totalRevenue  = await fetchAllOrdersRevenue(
      mlUserId, accessToken, dateFromCurrent, dateToCurrent, ordersData
    );

    // Período anterior (para tendência)
    const ordersPrev    = ordersPrevData.results || [];
    const totalSalesPrev   = ordersPrevData.paging?.total ?? ordersPrev.length;
    const totalRevenuePrev = await fetchAllOrdersRevenue(
      mlUserId, accessToken, dateFromPrevious, dateToPrevious, ordersPrevData
    );

    const totalVisits = visitsData.total_visits || 0;
    const conversion  = totalVisits > 0
      ? parseFloat(((totalSales / totalVisits) * 100).toFixed(1))
      : 0;

    // Tendências (delta % arredondado para 1 casa)
    const salesTrend    = calcTrend(totalSales,   totalSalesPrev);
    const revenueTrend  = calcTrend(totalRevenue, totalRevenuePrev);

    // Vendas por dia (últimos 14 dias) — usa pedidos já carregados (suficiente para o gráfico)
    const salesByDay = buildSalesByDay(orders, 14);

    // Produtos da conta
    const itemsRes = await fetch(
      `https://api.mercadolibre.com/users/${mlUserId}/items/search?limit=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const itemsData = await itemsRes.json();
    const itemIds   = itemsData.results || [];

    let productsUp   = [];
    let productsDown = [];

    if (itemIds.length > 0) {
      const ids       = itemIds.slice(0, 20).join(',');
      const detailRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${ids}&attributes=id,title,sold_quantity,price`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detailData = await detailRes.json();
      const items      = detailData.map(i => i.body).filter(Boolean);
      const sorted     = [...items].sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));

      productsUp = sorted.slice(0, 3).map(p => ({
        name:  p.title,
        sales: p.sold_quantity || 0,
        trend: '+',
      }));

      // Só monta productsDown se houver produtos suficientes para não sobrepor o top 3
      if (sorted.length > 3) {
        productsDown = sorted.slice(-3).reverse().map(p => ({
          name:  p.title,
          sales: p.sold_quantity || 0,
          trend: '-',
        }));
      }
    }

    // Última venda
    const lastOrder     = orders[0] || null;
    const lastSale      = lastOrder ? {
      at:      lastOrder.date_created,
      amount:  lastOrder.total_amount || 0,
      product: lastOrder.order_items?.[0]?.item?.title || null,
    } : null;

    return res.status(200).json({
      account_id,
      ml_user_id: mlUserId,
      kpis: {
        sales:           totalSales,
        salesTrend,
        revenue:         totalRevenue,
        revenueTrend,
        visits:          totalVisits,
        visitsTrend:     0,   // API ML não expõe visitas do período anterior facilmente
        conversion,
        conversionTrend: 0,
      },
      salesByDay,
      productsUp,
      productsDown,
      lastSale,
    });

  } catch (error) {
    console.error(`[overview] Erro para ${account_id}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar dados da visão geral.' });
  }
}

// Soma total_amount de todos os pedidos do período, paginando se necessário.
// Reutiliza a primeira página já buscada para não dobrar requests no caso comum (<=50 pedidos).
async function fetchAllOrdersRevenue(mlUserId, accessToken, dateFrom, dateTo, firstPageData) {
  const results  = firstPageData.results || [];
  const total    = firstPageData.paging?.total ?? results.length;
  let revenue    = results.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  if (total <= results.length) return revenue;

  // Há mais páginas — buscar o restante
  const limit  = 50;
  const pages  = Math.ceil(total / limit);
  const baseUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}` +
    `&order.status=paid&order.date_created.from=${dateFrom}&order.date_created.to=${dateTo}&limit=${limit}`;

  for (let page = 1; page < pages; page++) {
    const res  = await fetch(`${baseUrl}&offset=${page * limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    (data.results || []).forEach(o => { revenue += (o.total_amount || 0); });
  }

  return revenue;
}

function calcTrend(current, previous) {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

function buildSalesByDay(orders, days) {
  const counts = Array(days).fill(0);
  const now    = new Date();
  orders.forEach(order => {
    const orderDate = new Date(order.date_created);
    const diffDays  = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    if (diffDays < days) counts[days - 1 - diffDays]++;
  });
  return counts;
}
