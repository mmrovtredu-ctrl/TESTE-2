// api/catalog.js — versão corrigida com paginação, health e visitas em lote
import { getTokenForAccount } from './_tokenHelper.js';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export default async function handler(req, res) {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id não informado.' });

  try {
    const accessToken = await getTokenForAccount(account_id);
    if (!accessToken) return res.status(401).json({ error: 'Conta não conectada.', not_connected: true });

    const userRes = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!userRes.ok) return res.status(401).json({ error: 'Token inválido.', not_connected: true });
    const user = await userRes.json();
    const mlUserId = user.id;

    // ── Coleta TODOS os IDs com paginação ──────────────────────
    let allItemIds = [];
    let offset = 0;
    const pageLimit = 50;

    while (true) {
      const listRes = await fetch(
        `https://api.mercadolibre.com/users/${mlUserId}/items/search?limit=${pageLimit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listRes.ok) break;
      const listData = await listRes.json();
      const ids = listData.results || [];
      allItemIds = allItemIds.concat(ids);
      if (ids.length < pageLimit || allItemIds.length >= 500) break;
      offset += pageLimit;
    }

    if (allItemIds.length === 0) return res.status(200).json({ products: [], total: 0 });

    // ── Detalhes em lotes de 20 ────────────────────────────────
    const chunks   = chunkArray(allItemIds, 20);
    const products = [];

    for (const chunk of chunks) {
      const detailRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${chunk.join(',')}&attributes=id,title,price,available_quantity,sold_quantity,status,category_id,thumbnail,health`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) continue;
      const detailData = await detailRes.json();

      for (const entry of detailData) {
        if (!entry.body || entry.code !== 200) continue;
        const p = entry.body;
        const statusMap = { active: 'ativo', paused: 'pausado', closed: 'encerrado', inactive: 'pausado' };

        products.push({
          id:        p.id,
          name:      p.title,
          thumbnail: p.thumbnail ? p.thumbnail.replace('http://', 'https://') : null,
          price:     p.price || 0,
          stock:     p.available_quantity || 0,
          sales30d:  p.sold_quantity || 0,
          visits30d: 0, // preenchido abaixo
          status:    p.available_quantity === 0 ? 'sem_estoque' : (statusMap[p.status] || p.status),
          health:    typeof p.health === 'number' ? p.health : 0,
          category:  p.category_id || '—',
        });
      }
    }

    // ── Visitas individuais (lotes de 10 para não fazer timeout) ─
    const itemChunks = chunkArray(products, 10);
    for (const batch of itemChunks) {
      await Promise.allSettled(
        batch.map(async product => {
          try {
            const vRes = await fetch(
              `https://api.mercadolibre.com/items/${product.id}/visits/time_window?last=30&unit=day`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (vRes.ok) {
              const vData = await vRes.json();
              product.visits30d = vData.total_visits || 0;
            }
          } catch (_) {}
        })
      );
    }

    // ── Health individual para itens com health=0 ─────────────
    const noHealth = products.filter(p => p.health === 0).slice(0, 30);
    await Promise.allSettled(
      noHealth.map(async product => {
        try {
          const hRes = await fetch(
            `https://api.mercadolibre.com/items/${product.id}/health`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (hRes.ok) {
            const hData = await hRes.json();
            product.health = hData.health || 0;
          }
        } catch (_) {}
      })
    );

    // ── Nomes de categorias ────────────────────────────────────
    const categoryIds = [...new Set(products.map(p => p.category).filter(c => c && c.startsWith('MLB')))];
    if (categoryIds.length > 0) {
      const catResults = await Promise.allSettled(
        categoryIds.map(id => fetch(`https://api.mercadolibre.com/categories/${id}`).then(r => r.ok ? r.json() : null))
      );
      const catMap = {};
      catResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) catMap[categoryIds[i]] = r.value.name;
      });
      products.forEach(p => { if (catMap[p.category]) p.category = catMap[p.category]; });
    }

    return res.status(200).json({ account_id, ml_user_id: mlUserId, products, total: products.length });

  } catch (error) {
    console.error(`[catalog] Erro para ${account_id}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar catálogo.' });
  }
}
