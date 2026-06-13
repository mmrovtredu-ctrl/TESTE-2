// api/campaigns.js
// Busca campanhas do vendedor (promoções de desconto) + Product Ads
// Cole este arquivo em: api/campaigns.js

export default async function handler(req, res) {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id não informado.' });

  try {
    const token = await getAccountToken(account_id);
    if (!token) return res.status(401).json({ error: 'Conta não conectada.', not_connected: true });

    // Refresh do token se necessário
    const accessToken = await ensureFreshToken(token, account_id);

    // Busca em paralelo: campanhas de desconto + Product Ads
    const [sellerCampaigns, productAds] = await Promise.allSettled([
      fetchSellerCampaigns(accessToken),
      fetchProductAds(accessToken),
    ]);

    const campaigns = sellerCampaigns.status === 'fulfilled' ? sellerCampaigns.value : [];
    const ads = productAds.status === 'fulfilled' ? productAds.value : null;

    return res.status(200).json({ campaigns, ads });

  } catch (error) {
    console.error('Erro em /api/campaigns:', error);
    return res.status(500).json({ error: 'Erro ao buscar campanhas.' });
  }
}

// ─── CAMPANHAS DE DESCONTO DO VENDEDOR ───────────────────────────────────────

async function fetchSellerCampaigns(accessToken) {
  // Lista todas as campanhas do vendedor
  const res = await fetch(
    'https://api.mercadolibre.com/seller-promotions/promotions?promotion_type=SELLER_CAMPAIGN&app_version=v2',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    console.warn('Erro ao buscar campanhas do vendedor:', err);
    return [];
  }

  const data = await res.json();
  const campaigns = data.results || [];

  if (campaigns.length === 0) return [];

  // Para cada campanha, busca os itens (produtos incluídos)
  const withItems = await Promise.all(
    campaigns.map(async (c) => {
      try {
        const itemsRes = await fetch(
          `https://api.mercadolibre.com/seller-promotions/promotions/${c.id}/items?promotion_type=SELLER_CAMPAIGN&app_version=v2`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const itemsData = itemsRes.ok ? await itemsRes.json() : {};
        const items = itemsData.results || [];

        // Busca títulos dos produtos em lote (até 20 por vez)
        const itemIds = items.map(i => i.id).slice(0, 20);
        let itemDetails = [];
        if (itemIds.length > 0) {
          const detailRes = await fetch(
            `https://api.mercadolibre.com/items?ids=${itemIds.join(',')}&attributes=id,title,price,thumbnail`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const detailData = detailRes.ok ? await detailRes.json() : [];
          itemDetails = detailData.map(d => d.body).filter(Boolean);
        }

        // Mescla dados do item com dados da promoção
        const enrichedItems = items.map(item => {
          const detail = itemDetails.find(d => d.id === item.id) || {};
          return {
            id: item.id,
            title: detail.title || item.id,
            thumbnail: detail.thumbnail || null,
            originalPrice: item.original_price || detail.price || 0,
            dealPrice: item.price || 0,
            discount: item.original_price && item.price
              ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
              : 0,
            status: item.status,
            startDate: item.start_date,
            endDate: item.end_date,
          };
        });

        return {
          id: c.id,
          name: c.name,
          type: 'SELLER_CAMPAIGN',
          subType: c.sub_type,
          status: c.status,                // pending | started | finished
          startDate: c.start_date,
          finishDate: c.finish_date,
          itemCount: items.length,
          items: enrichedItems,
        };
      } catch (err) {
        console.warn(`Erro ao buscar itens da campanha ${c.id}:`, err);
        return { ...c, items: [] };
      }
    })
  );

  return withItems;
}

// ─── PRODUCT ADS (ANÚNCIOS PAGOS) ────────────────────────────────────────────

async function fetchProductAds(accessToken) {
  // Busca o user_id
  const userRes = await fetch('https://api.mercadolibre.com/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  const userId = user.id;

  // Busca a conta de anúncios
  const accountRes = await fetch(
    `https://api.mercadolibre.com/advertising/onsite/accounts?user_id=${userId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!accountRes.ok) return null;
  const accountData = await accountRes.json();
  const adAccountId = accountData?.results?.[0]?.id;
  if (!adAccountId) return null;

  // Datas dos últimos 30 dias
  const today = new Date();
  const thirtyAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
  const dateFrom = thirtyAgo.toISOString().split('T')[0];
  const dateTo = today.toISOString().split('T')[0];

  // Busca campanhas de Product Ads
  const campRes = await fetch(
    `https://api.mercadolibre.com/advertising/onsite/accounts/${adAccountId}/campaigns?limit=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!campRes.ok) return null;
  const campData = await campRes.json();
  const adCampaigns = campData.results || [];

  if (adCampaigns.length === 0) return { campaigns: [], totals: null };

  // Busca métricas de cada campanha
  const campaignsWithMetrics = await Promise.all(
    adCampaigns.map(async (c) => {
      try {
        const metricsRes = await fetch(
          `https://api.mercadolibre.com/advertising/onsite/accounts/${adAccountId}/campaigns/${c.id}/metrics?date_from=${dateFrom}&date_to=${dateTo}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const metrics = metricsRes.ok ? await metricsRes.json() : {};
        const m = metrics.results?.[0] || {};

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          type: 'PRODUCT_ADS',
          spend30d: m.costs || 0,
          revenue30d: m.attributed_sales || 0,
          clicks: m.clicks || 0,
          impressions: m.prints || 0,
          conversions: m.attributed_orders || 0,
          ctr: m.prints > 0 ? parseFloat(((m.clicks / m.prints) * 100).toFixed(2)) : 0,
          acos: m.attributed_sales > 0
            ? parseFloat(((m.costs / m.attributed_sales) * 100).toFixed(1))
            : 0,
        };
      } catch {
        return { ...c, type: 'PRODUCT_ADS', spend30d: 0, revenue30d: 0, clicks: 0, impressions: 0, conversions: 0, ctr: 0, acos: 0 };
      }
    })
  );

  // Totais consolidados
  const totals = campaignsWithMetrics.reduce((acc, c) => ({
    totalSpend30d: acc.totalSpend30d + c.spend30d,
    totalRevenue30d: acc.totalRevenue30d + c.revenue30d,
    totalClicks: acc.totalClicks + c.clicks,
    totalImpressions: acc.totalImpressions + c.impressions,
    totalConversions: acc.totalConversions + c.conversions,
  }), { totalSpend30d: 0, totalRevenue30d: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0 });

  totals.totalAcos = totals.totalRevenue30d > 0
    ? parseFloat(((totals.totalSpend30d / totals.totalRevenue30d) * 100).toFixed(1))
    : 0;
  totals.totalCtr = totals.totalImpressions > 0
    ? parseFloat(((totals.totalClicks / totals.totalImpressions) * 100).toFixed(2))
    : 0;

  return { campaigns: campaignsWithMetrics, totals };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getAccountToken(accountId) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}&select=access_token,refresh_token,expires_in,updated_at&connected=eq.true`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}

async function ensureFreshToken(token, accountId) {
  // Verifica se o token expirou (margem de 5 minutos)
  const updatedAt = new Date(token.updated_at).getTime();
  const expiresMs = (token.expires_in || 21600) * 1000;
  const isExpired = Date.now() > updatedAt + expiresMs - 5 * 60 * 1000;

  if (!isExpired) return token.access_token;

  // Faz refresh
  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: token.refresh_token,
    }),
  });

  if (!refreshRes.ok) return token.access_token; // usa o atual se falhar

  const refreshData = await refreshRes.json();

  // Salva o novo token no Supabase
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/ml_accounts?account_id=eq.${accountId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expires_in: refreshData.expires_in,
      updated_at: new Date().toISOString(),
    }),
  });

  return refreshData.access_token;
}
