// api/campaigns.js
// ─────────────────────────────────────────────────────────────
// CAMPANHAS — duas frentes:
//   1) Promoções/descontos do vendedor  (campaigns) -> SEMPRE funciona
//      via /seller-promotions/users/{user_id}
//   2) Publicidade / Product Ads        (ads)       -> TENTA; se o ML
//      bloquear (precisa de permissão de publicidade), volta null e a
//      tela mostra o estado vazio amigável.
// A frente (js/campaigns.js) já consome { campaigns, ads, not_connected }.
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const API = 'https://api.mercadolibre.com';

// fetch JSON tolerante a erro
async function jget(url, token, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: 200, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// ── Títulos dos itens (multiget) ──────────────────────────────
async function fetchItemTitles(ids, token) {
  const map = {};
  if (!ids.length) return map;
  const chunk = ids.slice(0, 20).join(',');
  const r = await jget(`${API}/items?ids=${chunk}&attributes=id,title`, token);
  if (r.ok && Array.isArray(r.data)) {
    r.data.forEach(entry => {
      const b = entry?.body;
      if (b?.id) map[b.id] = b.title || b.id;
    });
  }
  return map;
}

// ── Promoções do vendedor ─────────────────────────────────────
async function getSellerCampaigns(userId, token) {
  const list = await jget(
    `${API}/seller-promotions/users/${userId}?app_version=v2`, token);
  if (!list.ok || !Array.isArray(list.data?.results)) {
    return { campaigns: [], debug: { promo_status: list.status } };
  }

  // Pega no máximo 12 promoções, prioriza ativas/agendadas
  const order = { started: 0, pending: 1, finished: 2 };
  const promos = list.data.results
    .slice()
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    .slice(0, 12);

  const campaigns = await Promise.all(promos.map(async (p) => {
    // itens da promoção
    const itemsRes = await jget(
      `${API}/seller-promotions/promotions/${p.id}/items` +
      `?promotion_type=${encodeURIComponent(p.type)}&app_version=v2&limit=50`, token);

    const rawItems = (itemsRes.ok && Array.isArray(itemsRes.data?.results))
      ? itemsRes.data.results : [];
    const itemCount = itemsRes.data?.paging?.total ?? rawItems.length;

    // títulos (até 20)
    const ids = rawItems.map(it => it.id).filter(Boolean).slice(0, 20);
    const titles = await fetchItemTitles(ids, token);

    const items = rawItems.slice(0, 20).map(it => {
      const orig = Number(it.original_price) || 0;
      const deal = Number(it.price) || 0;
      const discount = (orig > 0 && deal > 0 && deal < orig)
        ? Math.round((1 - deal / orig) * 100) : 0;
      return {
        title: titles[it.id] || it.id,
        discount,
        originalPrice: orig,
        dealPrice: deal,
        status: it.status || '—',
      };
    });

    return {
      id: p.id,
      name: p.name || `${p.type} ${p.id}`,
      type: p.type,
      itemCount,
      startDate: p.start_date || null,
      finishDate: p.finish_date || null,
      status: p.status,
      items,
    };
  }));

  return { campaigns, debug: { promo_status: 200, promo_total: list.data.paging?.total } };
}

// ── Publicidade / Product Ads (melhor esforço) ────────────────
async function getProductAds(token) {
  const debug = {};
  // 1) advertisers (precisa de permissão de publicidade)
  const adv = await jget(`${API}/advertising/advertisers?product_id=PADS`,
    token, { 'Api-Version': '1' });
  debug.advertisers_status = adv.status;

  if (!adv.ok || !Array.isArray(adv.data?.advertisers) || !adv.data.advertisers.length) {
    return { ads: null, debug };
  }

  const advertiserId = adv.data.advertisers[0].advertiser_id;
  debug.advertiser_id = advertiserId;

  // 2) campanhas do anunciante (estrutura varia; mapeamos defensivo)
  const camp = await jget(
    `${API}/advertising/product_ads/campaigns?advertiser_id=${advertiserId}&limit=50`,
    token, { 'Api-Version': '1' });
  debug.campaigns_status = camp.status;

  const raw = (camp.ok && Array.isArray(camp.data?.results)) ? camp.data.results
            : (camp.ok && Array.isArray(camp.data?.campaigns)) ? camp.data.campaigns
            : [];

  if (!raw.length) return { ads: null, debug };

  const campaigns = raw.map(c => {
    const m = c.metrics || c.metrics_summary || {};
    const spend = Number(m.cost ?? m.spend ?? 0);
    const revenue = Number(m.direct_amount ?? m.total_amount ?? m.revenue ?? 0);
    const clicks = Number(m.clicks ?? 0);
    const impressions = Number(m.prints ?? m.impressions ?? 0);
    const conversions = Number(m.direct_units ?? m.units ?? m.conversions ?? 0);
    const acos = revenue > 0 ? (spend / revenue) * 100 : 0;
    return {
      name: c.name || c.campaign_name || `Campanha ${c.id || ''}`,
      spend30d: spend,
      revenue30d: revenue,
      clicks,
      impressions,
      conversions,
      acos,
      status: (c.status || '').toLowerCase() || 'active',
    };
  });

  const totalSpend30d = campaigns.reduce((s, c) => s + c.spend30d, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue30d, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totals = {
    totalSpend30d,
    totalAcos: totalRevenue > 0 ? (totalSpend30d / totalRevenue) * 100 : 0,
    totalClicks,
    totalCtr: totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0,
  };

  return { ads: { totals, campaigns }, debug };
}

export default async function handler(req, res) {
  const accountId = req.query.account_id || 'acc_1';

  let token = null;
  try { token = await getTokenForAccount(accountId); } catch { token = null; }
  if (!token) {
    return res.status(409).json({ ok: false, not_connected: true, account_id: accountId });
  }

  try {
    // user_id da conta autenticada
    const me = await jget(`${API}/users/me`, token);
    const userId = me.ok ? me.data?.id : null;
    if (!userId) {
      return res.status(409).json({ ok: false, not_connected: true, account_id: accountId });
    }

    // Promoções (sempre) + Ads (tenta) em paralelo
    const [promoRes, adsRes] = await Promise.all([
      getSellerCampaigns(userId, token),
      getProductAds(token).catch(() => ({ ads: null, debug: { ads_error: true } })),
    ]);

    return res.status(200).json({
      ok: true,
      campaigns: promoRes.campaigns,
      ads: adsRes.ads,
      debug: { user_id: userId, ...promoRes.debug, ...adsRes.debug },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Erro ao carregar campanhas: ' + (err.message || 'desconhecido') });
  }
}
