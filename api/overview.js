// api/overview.js
// Busca dados reais da visão geral de uma conta ML

export default async function handler(req, res) {
  const { account_id } = req.query;

  if (!account_id) {
    return res.status(400).json({ error: 'account_id não informado.' });
  }

  try {
    const token = await getAccountToken(account_id);
    if (!token) {
      return res.status(401).json({ error: 'Conta não conectada.', not_connected: true });
    }

    // Busca dados do usuário ML
    const userRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();
    const mlUserId = user.id;

    // Datas dos últimos 30 dias
    const today = new Date();
    const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00.000-03:00';
    const dateTo = today.toISOString().split('T')[0] + 'T23:59:59.000-03:00';

    // Busca pedidos e visitas em paralelo
    const [ordersRes, visitsRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/orders/search?seller=${mlUserId}&order.date_created.from=${dateFrom}&order.date_created.to=${dateTo}&order.status=paid&limit=50`, {
        headers: { 'Authorization': `Bearer ${token.access_token}` }
      }),
      fetch(`https://api.mercadolibre.com/users/${mlUserId}/items/visits?last_days=30`, {
        headers: { 'Authorization': `Bearer ${token.access_token}` }
      }),
    ]);

    const ordersData = await ordersRes.json();
    const visitsData = await visitsRes.json();

    const orders = ordersData.results || [];
    const totalSales = ordersData.paging?.total || orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalVisits = visitsData.total_visits || 0;
    const conversion = totalVisits > 0 ? parseFloat(((totalSales / totalVisits) * 100).toFixed(1)) : 0;

    // Vendas por dia (últimos 14 dias)
    const salesByDay = buildSalesByDay(orders, 14);

    // Busca produtos da conta
    const itemsRes = await fetch(`https://api.mercadolibre.com/users/${mlUserId}/items/search?limit=20`, {
      headers: { 'Authorization': `Bearer ${token.access_token}` }
    });
    const itemsData = await itemsRes.json();
    const itemIds = itemsData.results || [];

    let productsUp = [];
    let productsDown = [];

    if (itemIds.length > 0) {
      const ids = itemIds.slice(0, 20).join(',');
      const detailRes = await fetch(`https://api.mercadolibre.com/items?ids=${ids}&attributes=id,title,sold_quantity,price`, {
        headers: { 'Authorization': `Bearer ${token.access_token}` }
      });
      const detailData = await detailRes.json();
      const items = detailData.map(i => i.body).filter(Boolean);
      const sorted = [...items].sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));

      productsUp = sorted.slice(0, 3).map(p => ({
        name: p.title,
        sales: p.sold_quantity || 0,
        trend: '+',
      }));
      productsDown = sorted.slice(-3).reverse().map(p => ({
        name: p.title,
        sales: p.sold_quantity || 0,
        trend: '-',
      }));
    }

    return res.status(200).json({
      kpis: {
        sales: totalSales,
        salesTrend: 0,
        revenue: totalRevenue,
        revenueTrend: 0,
        visits: totalVisits,
        visitsTrend: 0,
        conversion,
        conversionTrend: 0,
      },
      salesByDay,
      productsUp,
      productsDown,
    });

  } catch (error) {
    console.error('Erro em /api/overview:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da visão geral.' });
  }
}

async function getAccountToken(accountId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/ml_accounts?account_id=eq.${accountId}&select=access_token,refresh_token&connected=eq.true`,
    { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
  );
  const data = await res.json();
  return data?.[0] || null;
}

function buildSalesByDay(orders, days) {
  const counts = Array(days).fill(0);
  const now = new Date();
  orders.forEach(order => {
    const orderDate = new Date(order.date_created);
    const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    if (diffDays < days) counts[days - 1 - diffDays]++;
  });
  return counts;
}
