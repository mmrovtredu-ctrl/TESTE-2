// api/competitors-track.js
// ─────────────────────────────────────────────────────────────
// Rastreia sellers concorrentes específicos (cadastrados pelo usuário).
// Busca todos os produtos de cada seller via API pública do ML.
// Não requer token — API pública.
//
// GET /api/competitors-track
// ─────────────────────────────────────────────────────────────

// ─── SELLERS MONITORADOS (cadastre os seus aqui) ─────────────
// Extraídos dos links enviados:
// https://lista.mercadolivre.com.br/_CustId_353434347       → seller_id: 353434347
// https://www.mercadolivre.com.br/pagina/hiltonrefrigeracaohr → seller_id: 2439036286
// https://www.mercadolivre.com.br/pagina/clickshopfilial    → seller_id: 2329930408

const TRACKED_SELLERS = [
  { seller_id: '353434347',  name: 'Concorrente 1',         page: 'lista.mercadolivre.com.br/_CustId_353434347' },
  { seller_id: '2439036286', name: 'Hilton Refrigeração HR', page: 'hiltonrefrigeracaohr' },
  { seller_id: '2329930408', name: 'Clickshop Filial',       page: 'clickshopfilial' },
];

export default async function handler(req, res) {
  const { category_id, limit = 20 } = req.query;

  try {
    // Busca produtos de todos os sellers em paralelo
    const sellersData = await Promise.allSettled(
      TRACKED_SELLERS.map(seller => fetchSellerProducts(seller, category_id, parseInt(limit) || 20))
    );

    const competitors = sellersData.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      console.warn(`[competitors-track] Falha seller ${TRACKED_SELLERS[i].seller_id}:`, result.reason?.message);
      return {
        ...TRACKED_SELLERS[i],
        products:    [],
        total:       0,
        error:       true,
      };
    });

    return res.status(200).json({ competitors, tracked_at: new Date().toISOString() });

  } catch (error) {
    console.error('[competitors-track] Erro:', error);
    return res.status(500).json({ error: 'Erro ao rastrear concorrentes.' });
  }
}

// ─── Busca produtos de um seller ─────────────────────────────

async function fetchSellerProducts(seller, categoryId, limit) {
  // Monta a URL — com ou sem filtro de categoria
  let url = `https://api.mercadolibre.com/sites/MLB/search?seller_id=${seller.seller_id}&limit=${limit}&sort=relevance`;
  if (categoryId) url += `&category=${categoryId}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'MLControl/1.0' } });

  if (!res.ok) {
    throw new Error(`ML search seller ${seller.seller_id}: ${res.status}`);
  }

  const data     = await res.json();
  const results  = data.results || [];

  // Busca informações do vendedor
  let sellerInfo = {};
  try {
    const userRes = await fetch(`https://api.mercadolibre.com/users/${seller.seller_id}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      sellerInfo = {
        reputation:        userData.seller_reputation?.level_id || '—',
        transactions:      userData.seller_reputation?.transactions?.total || 0,
        positive_ratings:  userData.seller_reputation?.transactions?.ratings?.positive || 0,
        power_seller:      userData.seller_reputation?.power_seller_status || null,
        nickname:          userData.nickname || seller.name,
      };
    }
  } catch (_) {}

  // Formata produtos
  const products = results.map(item => ({
    id:            item.id,
    title:         item.title,
    price:         item.price,
    currency:      item.currency_id,
    thumbnail:     item.thumbnail?.replace('http://', 'https://') || null,
    sold_quantity: item.sold_quantity || 0,
    free_shipping: item.shipping?.free_shipping || false,
    condition:     item.condition === 'new' ? 'Novo' : 'Usado',
    category_id:   item.category_id,
    permalink:     item.permalink,
  }));

  // Estatísticas básicas
  const prices       = products.map(p => p.price).filter(p => p > 0);
  const avgPrice     = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice     = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice     = prices.length > 0 ? Math.max(...prices) : 0;
  const totalSales   = products.reduce((s, p) => s + (p.sold_quantity || 0), 0);
  const freeShipping = products.filter(p => p.free_shipping).length;

  return {
    seller_id:      seller.seller_id,
    name:           sellerInfo.nickname || seller.name,
    page:           seller.page,
    reputation:     sellerInfo.reputation,
    transactions:   sellerInfo.transactions,
    positive_pct:   sellerInfo.transactions > 0
      ? Math.round((sellerInfo.positive_ratings / sellerInfo.transactions) * 100)
      : 0,
    power_seller:   sellerInfo.power_seller,
    total:          data.paging?.total || products.length,
    products,
    stats: {
      avg_price:      Math.round(avgPrice * 100) / 100,
      min_price:      minPrice,
      max_price:      maxPrice,
      total_sales:    totalSales,
      free_shipping_pct: products.length > 0
        ? Math.round((freeShipping / products.length) * 100)
        : 0,
    },
  };
}
