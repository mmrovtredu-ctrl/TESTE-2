// api/competitors-track.js
// ─────────────────────────────────────────────────────────────
// CONCORRENTES POR LINK DO PRODUTO
// Recebe ?link= (ou ?product=) com um link/ID do Mercado Livre e
// devolve: o produto colado (em cima) + os vendedores concorrentes
// que vendem o MESMO produto (embaixo).
// Usa o TOKEN de uma conta conectada (a busca pública do ML sem
// token deixou de funcionar). Tenta a conta pedida; se ela não
// estiver conectada, usa qualquer conta conectada.
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const SITE = 'MLB';

// ── Extrai o ID do ML de um link ou texto ─────────────────────
// Suporta:
//   catálogo:  .../p/MLB26986602         -> { id:'MLB26986602', kind:'product' }
//   anúncio:   .../MLB-2075324636-...     -> { id:'MLB2075324636', kind:'item' }
//   ID cru:    MLB26986602 / MLB2075324636
function parseMlId(raw) {
  if (!raw) return null;
  const text = String(raw).trim();

  // /p/MLBxxxx  => página de catálogo (lista vários vendedores)
  const pMatch = text.match(/\/p\/(MLB\d+)/i);
  if (pMatch) return { id: pMatch[1].toUpperCase(), kind: 'product' };

  // MLB-xxxx (com hífen) => anúncio individual
  const dashMatch = text.match(/MLB-?(\d{6,})/i);
  if (dashMatch) {
    const hadDash = /MLB-\d/i.test(text);
    return { id: 'MLB' + dashMatch[1], kind: hadDash ? 'item' : 'unknown' };
  }
  return null;
}

// ── Acha qualquer conta conectada (fallback de token) ─────────
async function getAnyConnectedToken() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ml_accounts` +
      `?connected=eq.true&select=account_id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const acc = rows?.[0]?.account_id;
    if (!acc) return null;
    return await getTokenForAccount(acc);
  } catch {
    return null;
  }
}

// ── fetch JSON com token, tolerante a erro ────────────────────
async function mlGet(url, token) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: 200, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
}

// ── Resolve o "cabeçalho" do produto colado ───────────────────
async function resolveHeader(parsed, token) {
  // 1) tenta como produto de catálogo
  if (parsed.kind === 'product' || parsed.kind === 'unknown') {
    const p = await mlGet(`https://api.mercadolibre.com/products/${parsed.id}`, token);
    if (p.ok && p.data) {
      const d = p.data;
      const pic = d.pictures?.[0]?.secure_url || d.pictures?.[0]?.url || null;
      const price = d.buy_box_winner?.price ?? null;
      return {
        header: {
          id: d.id, title: d.name || d.title || parsed.id,
          thumbnail: pic, price, permalink: d.permalink || null, catalog: true,
        },
        catalogId: d.id,
      };
    }
  }
  // 2) tenta como anúncio individual
  const it = await mlGet(`https://api.mercadolibre.com/items/${parsed.id}`, token);
  if (it.ok && it.data) {
    const d = it.data;
    return {
      header: {
        id: d.id, title: d.title || parsed.id,
        thumbnail: d.secure_thumbnail || d.thumbnail || null,
        price: d.price ?? null, permalink: d.permalink || null,
        catalog: !!d.catalog_product_id,
        sellerId: d.seller_id || null,
      },
      catalogId: d.catalog_product_id || null,
      itemTitle: d.title || null,
    };
  }
  return { header: null, catalogId: null };
}

// ── Busca a lista de ofertas (vendedores) ─────────────────────
async function fetchOffers(catalogId, fallbackTitle, token) {
  let raw = [];

  // A) catálogo -> /products/{id}/items  (todos os vendedores)
  if (catalogId) {
    const r = await mlGet(
      `https://api.mercadolibre.com/products/${catalogId}/items?limit=20`, token);
    if (r.ok && Array.isArray(r.data?.results) && r.data.results.length) {
      raw = r.data.results;
    }
    // B) fallback: search por catalog_product_id
    if (!raw.length) {
      const s = await mlGet(
        `https://api.mercadolibre.com/sites/${SITE}/search?catalog_product_id=${catalogId}&limit=20`, token);
      if (s.ok && Array.isArray(s.data?.results)) raw = s.data.results;
    }
  }

  // C) último recurso: busca por texto do título
  if (!raw.length && fallbackTitle) {
    const q = encodeURIComponent(fallbackTitle.split(' ').slice(0, 6).join(' '));
    const s = await mlGet(
      `https://api.mercadolibre.com/sites/${SITE}/search?q=${q}&limit=20`, token);
    if (s.ok && Array.isArray(s.data?.results)) raw = s.data.results;
  }

  return raw;
}

// ── Normaliza uma oferta (formatos /items e /search diferem) ──
function normalizeOffer(o) {
  // /products/{id}/items: { item_id, seller_id, price, ... }
  // /search:              { id, seller:{id,nickname}, price, sold_quantity, shipping:{free_shipping}, available_quantity, permalink, title }
  const sellerId = o.seller_id || o.seller?.id || null;
  const shipping = o.shipping || {};
  return {
    item_id:   o.item_id || o.id || null,
    seller_id: sellerId,
    seller_nick: o.seller?.nickname || null,
    price:     typeof o.price === 'number' ? o.price : (o.price ? Number(o.price) : null),
    sold:      o.sold_quantity ?? null,
    available: o.available_quantity ?? null,
    free_shipping: shipping.free_shipping ?? null,
    permalink: o.permalink || null,
    title:     o.title || null,
  };
}

// ── Enriquece reputacao via /users/{id} ──────────────────────
async function enrichSeller(sellerId, token) {
  const u = await mlGet(`https://api.mercadolibre.com/users/${sellerId}`, token);
  if (!u.ok || !u.data) return null;
  const d = u.data;
  const rep = d.seller_reputation || {};
  const tr = rep.transactions || {};
  const positive = tr.ratings?.positive;
  return {
    seller_id: sellerId,
    nickname: d.nickname || null,
    level_id: rep.level_id || null,                 // ex "5_green"
    power_seller: rep.power_seller_status || null,  // platinum/gold/silver
    positive_pct: typeof positive === 'number' ? Math.round(positive * 100) : null,
    total_ratings: tr.total ?? null,
  };
}

export default async function handler(req, res) {
  const link = req.query.link || req.query.product || req.query.q || '';
  const accountId = req.query.account_id || 'acc_1';

  const parsed = parseMlId(link);
  if (!parsed) {
    return res.status(400).json({
      ok: false,
      error: 'Não consegui identificar um produto nesse link. Cole o link do produto no Mercado Livre (precisa ter MLB e números).',
    });
  }

  // Token: tenta a conta pedida, senão qualquer conta conectada
  let token = null;
  let usedFallback = false;
  try { token = await getTokenForAccount(accountId); } catch { token = null; }
  if (!token) { token = await getAnyConnectedToken(); usedFallback = true; }

  if (!token) {
    return res.status(409).json({
      ok: false,
      error: 'Nenhuma loja conectada. Conecte pelo menos uma loja (ex: Urso Forte) para pesquisar concorrentes.',
    });
  }

  try {
    // 1) Produto colado (cabeçalho)
    const { header, catalogId, itemTitle } = await resolveHeader(parsed, token);

    // 2) Ofertas / vendedores
    const rawOffers = await fetchOffers(catalogId, header?.title || itemTitle, token);

    // 3) Normaliza + dedupe por vendedor (1 oferta por vendedor, a mais barata)
    const byseller = new Map();
    for (const o of rawOffers.map(normalizeOffer)) {
      if (!o.seller_id || o.price == null) continue;
      const prev = byseller.get(o.seller_id);
      if (!prev || o.price < prev.price) byseller.set(o.seller_id, o);
    }
    let offers = Array.from(byseller.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, 8);

    // 4) Enriquece reputação (em paralelo)
    const reps = await Promise.all(
      offers.map(o => enrichSeller(o.seller_id, token).catch(() => null))
    );
    const repMap = new Map();
    reps.forEach(r => { if (r) repMap.set(r.seller_id, r); });

    const competitors = offers.map(o => {
      const r = repMap.get(o.seller_id) || {};
      return {
        seller: o.seller_nick || r.nickname || `Vendedor ${o.seller_id}`,
        seller_id: o.seller_id,
        price: o.price,
        available: o.available,           // estoque (pode vir null)
        sold: o.sold,                     // vendas (pode vir null)
        level_id: r.level_id || null,
        power_seller: r.power_seller || null,
        positive_pct: r.positive_pct ?? null,
        total_ratings: r.total_ratings ?? null,
        free_shipping: o.free_shipping,
        permalink: o.permalink,
        title: o.title,
      };
    });

    return res.status(200).json({
      ok: true,
      product: header || { id: parsed.id, title: parsed.id, catalog: false },
      competitors,
      debug: {
        parsed_kind: parsed.kind,
        catalog_id: catalogId,
        raw_count: rawOffers.length,
        used_fallback_token: usedFallback,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Erro ao buscar concorrentes: ' + (err.message || 'desconhecido') });
  }
}
