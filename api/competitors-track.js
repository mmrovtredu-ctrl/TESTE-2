// api/competitors-track.js
// ─────────────────────────────────────────────────────────────
// CONCORRENTES POR LINK DO PRODUTO — aceita TANTO catálogo QUANTO
// anúncio individual (e ID puro).
//
// Fluxo:
//   1) Tenta resolver o que foi colado como ANÚNCIO (/items/{id})
//      e como PRODUTO DE CATÁLOGO (/products/{id}), na ordem mais
//      provável conforme o formato do link, mas com fallback cruzado.
//   2) Se o anúncio pertence a um catálogo (catalog_product_id),
//      pivota para o catálogo e lista TODOS os vendedores daquele
//      produto (a concorrência real).
//   3) Se não houver catálogo (anúncio avulso), busca por título e
//      mostra concorrentes de produtos similares.
//
// Usa o TOKEN de uma conta conectada (a busca pública sem token
// deixou de funcionar). Tenta a conta pedida; senão, qualquer uma.
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const API  = 'https://api.mercadolibre.com';
const SITE = 'MLB';

// ── Extrai o ID do ML de um link, ID ou texto ─────────────────
// Suporta:
//   catálogo:  .../p/MLB26986602            -> { id, kind:'product' }
//   anúncio:   .../MLB-2075324636-...        -> { id, kind:'item' }
//   query:     ...item_id=MLB2075324636      -> { id, kind:'item' }
//   ID cru:    MLB26986602 / MLB2075324636   -> { id, kind:'unknown' }
function parseMlId(raw) {
  if (!raw) return null;
  const text = String(raw).trim();

  // /p/MLBxxxx => página de catálogo (vários vendedores)
  const pMatch = text.match(/\/p\/(MLB\d+)/i);
  if (pMatch) return { id: pMatch[1].toUpperCase(), kind: 'product' };

  // item_id=MLBxxxx ou wid=MLBxxxx => anúncio
  const qMatch = text.match(/(?:item_id|wid)=?(MLB\d{6,})/i);
  if (qMatch) return { id: qMatch[1].toUpperCase(), kind: 'item' };

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
      `${SUPABASE_URL}/rest/v1/ml_accounts?connected=eq.true&select=account_id&limit=1`,
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
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// ── Resolve o que foi colado: anúncio E/OU catálogo ───────────
// Devolve o cabeçalho do produto + catalogId (se houver) + título
// de fallback + o seller do próprio anúncio (para não listar ele
// mesmo como concorrente).
async function resolveTarget(parsed, token) {
  let itemData = null;
  let productData = null;

  const tryItem = async () => {
    const it = await mlGet(`${API}/items/${parsed.id}`, token);
    if (it.ok && it.data) itemData = it.data;
  };
  const tryProduct = async () => {
    const p = await mlGet(`${API}/products/${parsed.id}`, token);
    if (p.ok && p.data) productData = p.data;
  };

  // Ordem conforme o formato; com fallback cruzado se o 1º falhar
  if (parsed.kind === 'product') {
    await tryProduct();
    if (!productData) await tryItem();
  } else {
    await tryItem();
    if (!itemData) await tryProduct();
  }

  // Descobre o catálogo: do produto direto, ou do anúncio que
  // pertence a um catálogo.
  let catalogId = null;
  if (itemData) catalogId = itemData.catalog_product_id || null;
  if (productData) catalogId = productData.id;

  // Se temos um anúncio com catálogo mas ainda não buscamos o
  // produto do catálogo, busca para enriquecer o cabeçalho.
  if (!productData && catalogId) {
    const p = await mlGet(`${API}/products/${catalogId}`, token);
    if (p.ok && p.data) productData = p.data;
  }

  // Monta o cabeçalho: prioriza dados do catálogo; senão, do anúncio.
  let header = null;
  if (productData) {
    const d = productData;
    const pic = d.pictures?.[0]?.secure_url || d.pictures?.[0]?.url
              || itemData?.secure_thumbnail || itemData?.thumbnail || null;
    const price = d.buy_box_winner?.price ?? itemData?.price ?? null;
    header = {
      id: d.id,
      title: d.name || d.title || itemData?.title || parsed.id,
      thumbnail: pic,
      price,
      permalink: d.permalink || itemData?.permalink || null,
      catalog: true,
    };
  } else if (itemData) {
    const d = itemData;
    header = {
      id: d.id,
      title: d.title || parsed.id,
      thumbnail: d.secure_thumbnail || d.thumbnail || null,
      price: d.price ?? null,
      permalink: d.permalink || null,
      catalog: !!d.catalog_product_id,
      sellerId: d.seller_id || null,
    };
  }

  return {
    header,
    catalogId,
    fallbackTitle: header?.title || itemData?.title || null,
    selfSellerId: itemData?.seller_id || null,
  };
}

// ── Busca as ofertas (vendedores) ─────────────────────────────
// Catálogo -> todos os vendedores do mesmo produto.
// Sem catálogo -> busca por título (produtos similares).
async function fetchOffers(catalogId, fallbackTitle, token) {
  let raw = [];

  if (catalogId) {
    // A) todos os vendedores do produto de catálogo
    const r = await mlGet(`${API}/products/${catalogId}/items?limit=50`, token);
    if (r.ok && Array.isArray(r.data?.results) && r.data.results.length) {
      raw = r.data.results;
    }
    // B) fallback: search por catalog_product_id
    if (!raw.length) {
      const s = await mlGet(
        `${API}/sites/${SITE}/search?catalog_product_id=${catalogId}&limit=50`, token);
      if (s.ok && Array.isArray(s.data?.results)) raw = s.data.results;
    }
  }

  // C) anúncio avulso (ou catálogo sem ofertas): busca por título
  if (!raw.length && fallbackTitle) {
    const q = encodeURIComponent(fallbackTitle.split(' ').slice(0, 6).join(' '));
    const s = await mlGet(
      `${API}/sites/${SITE}/search?q=${q}&limit=30`, token);
    if (s.ok && Array.isArray(s.data?.results)) raw = s.data.results;
  }

  return raw;
}

// ── Normaliza uma oferta (formatos /items e /search diferem) ──
function normalizeOffer(o) {
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

// ── Enriquece reputação via /users/{id} ──────────────────────
async function enrichSeller(sellerId, token) {
  const u = await mlGet(`${API}/users/${sellerId}`, token);
  if (!u.ok || !u.data) return null;
  const d = u.data;
  const rep = d.seller_reputation || {};
  const tr = rep.transactions || {};
  const positive = tr.ratings?.positive;
  return {
    seller_id: sellerId,
    nickname: d.nickname || null,
    level_id: rep.level_id || null,
    power_seller: rep.power_seller_status || null,
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
      error: 'Não consegui identificar um produto nesse link. Cole o link do catálogo (/p/MLB...) ou de um anúncio (MLB-...) do Mercado Livre.',
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
      error: 'Nenhuma loja conectada. Conecte pelo menos uma loja para pesquisar concorrentes.',
    });
  }

  try {
    // 1) Resolve catálogo e/ou anúncio
    const { header, catalogId, fallbackTitle, selfSellerId } =
      await resolveTarget(parsed, token);

    // 2) Ofertas / vendedores
    const rawOffers = await fetchOffers(catalogId, fallbackTitle, token);

    // 3) Normaliza + dedupe por vendedor (a mais barata por vendedor),
    //    e remove o próprio anúncio colado da lista de concorrentes.
    const byseller = new Map();
    for (const o of rawOffers.map(normalizeOffer)) {
      if (!o.seller_id || o.price == null) continue;
      if (selfSellerId && String(o.seller_id) === String(selfSellerId)) continue;
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
        available: o.available,
        sold: o.sold,
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
        is_catalog: !!catalogId,
        raw_count: rawOffers.length,
        used_fallback_token: usedFallback,
      },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Erro ao buscar concorrentes: ' + (err.message || 'desconhecido'),
    });
  }
}
