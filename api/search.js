// api/search.js
// ─────────────────────────────────────────────────────────────
// Busca produtos no Mercado Livre por texto livre.
// Usado pela barra de pesquisa de "Analisar produto" e "Marketing".
// Não requer token — usa API pública do ML.
//
// GET /api/search?q=gas+r134a&limit=8
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { q, limit = 8 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Digite ao menos 2 caracteres para buscar.' });
  }

  try {
    const query    = encodeURIComponent(q.trim());
    const maxItems = Math.min(parseInt(limit) || 8, 20);

    // Busca na API pública do ML (sem token)
    const searchRes = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=${maxItems}&sort=relevance`,
      { headers: { 'User-Agent': 'MLControl/1.0' } }
    );

    if (!searchRes.ok) {
      throw new Error(`ML search error: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const results    = searchData.results || [];

    // Formata os resultados para o frontend
    const items = results.map(item => ({
      id:            item.id,
      title:         item.title,
      price:         item.price,
      currency:      item.currency_id,
      thumbnail:     item.thumbnail?.replace('http://', 'https://') || null,
      condition:     item.condition === 'new' ? 'Novo' : 'Usado',
      sold_quantity: item.sold_quantity || 0,
      free_shipping: item.shipping?.free_shipping || false,
      seller:        item.seller?.nickname || '—',
      seller_id:     item.seller?.id || null,
      category_id:   item.category_id,
      permalink:     item.permalink,
      // Link direto para usar no analisar/marketing
      ml_link: `https://www.mercadolibre.com.br/${item.id.replace('MLB', 'p/MLB')}`,
    }));

    return res.status(200).json({
      query:   q.trim(),
      total:   searchData.paging?.total || items.length,
      items,
    });

  } catch (error) {
    console.error('[search] Erro:', error);
    return res.status(500).json({ error: 'Erro ao buscar no Mercado Livre.' });
  }
}
