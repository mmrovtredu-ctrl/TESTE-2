// api/sales-today.js
// ─────────────────────────────────────────────────────────────
// VENDAS DE HOJE (tempo real) para UMA conta:
//   - Pedidos PAGOS de hoje (produto, valor, hora, qtd)
//   - Faturamento do dia, taxa do ML e "recebido após taxa"
//   - Estoque ATUAL de cada item vendido hoje
//   - Quantos anúncios estão PAUSADOS (+ alguns exemplos)
//
// Observação sobre LUCRO:
//   O ML não armazena o CUSTO do produto. Por isso aqui só dá
//   para calcular "recebido após taxa do ML" (faturamento menos
//   comissão). O lucro real depende do custo, que o vendedor
//   precisa cadastrar — fica para o próximo passo.
// ─────────────────────────────────────────────────────────────

import { getTokenForAccount } from './_tokenHelper.js';

const API = 'https://api.mercadolibre.com';

async function jget(url, token) {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { ok: false, status: r.status, data: null };
    return { ok: true, status: 200, data: await r.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// Intervalo de "hoje" no fuso de São Paulo (-03:00)
function saoPauloTodayRange() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const ymd  = fmt.format(new Date()); // YYYY-MM-DD
  const from = `${ymd}T00:00:00.000-03:00`;
  const to   = `${ymd}T23:59:59.000-03:00`;
  return { ymd, from, to };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default async function handler(req, res) {
  const accountId = req.query.account_id;
  if (!accountId) return res.status(400).json({ error: 'account_id não informado.' });

  let token = null;
  try { token = await getTokenForAccount(accountId); } catch { token = null; }
  if (!token) return res.status(409).json({ not_connected: true, account_id: accountId });

  try {
    const me = await jget(`${API}/users/me`, token);
    const userId = me.ok ? me.data?.id : null;
    if (!userId) return res.status(409).json({ not_connected: true, account_id: accountId });

    const { ymd, from, to } = saoPauloTodayRange();

    // ── Pedidos pagos hoje ────────────────────────────────────
    const ord = await jget(
      `${API}/orders/search?seller=${userId}` +
      `&order.status=paid` +
      `&order.date_created.from=${encodeURIComponent(from)}` +
      `&order.date_created.to=${encodeURIComponent(to)}` +
      `&sort=date_desc&limit=50`, token);

    const orders = (ord.ok && Array.isArray(ord.data?.results)) ? ord.data.results : [];

    let revenue = 0, fees = 0, units = 0;
    const sales = [];
    const soldItemIds = new Set();

    for (const o of orders) {
      const amount = Number(o.total_amount) || 0;
      revenue += amount;

      const items = Array.isArray(o.order_items) ? o.order_items : [];
      let orderFee = 0, orderUnits = 0, firstTitle = null, firstItemId = null;

      items.forEach(it => {
        const q = Number(it.quantity) || 0;
        // NOTA: tratamos sale_fee como a taxa da LINHA do item.
        // Se notar que o valor da taxa veio pela metade quando a
        // quantidade é > 1, troque por: orderFee += (Number(it.sale_fee)||0) * q;
        orderFee  += Number(it.sale_fee) || 0;
        orderUnits += q;
        if (!firstTitle) { firstTitle = it.item?.title || null; firstItemId = it.item?.id || null; }
        if (it.item?.id) soldItemIds.add(it.item.id);
      });

      fees  += orderFee;
      units += orderUnits;

      const product = items.length > 1
        ? `${firstTitle || 'Produto'} +${items.length - 1}`
        : (firstTitle || 'Produto');

      sales.push({
        order_id: o.id,
        time:     o.date_created,
        product,
        item_id:  firstItemId,
        units:    orderUnits,
        amount:   round2(amount),
        fee:      round2(orderFee),
        net:      round2(amount - orderFee),
        stock:    null, // preenchido abaixo
      });
    }

    // ── Estoque atual dos itens vendidos hoje ─────────────────
    if (soldItemIds.size) {
      const ids = Array.from(soldItemIds).slice(0, 20).join(',');
      const det = await jget(`${API}/items?ids=${ids}&attributes=id,available_quantity`, token);
      const stockMap = {};
      if (det.ok && Array.isArray(det.data)) {
        det.data.forEach(e => { const b = e?.body; if (b?.id) stockMap[b.id] = b.available_quantity; });
      }
      sales.forEach(s => { if (s.item_id != null && stockMap[s.item_id] != null) s.stock = stockMap[s.item_id]; });
    }

    // ── Anúncios pausados ─────────────────────────────────────
    const paused   = await jget(`${API}/users/${userId}/items/search?status=paused&limit=20`, token);
    const pausedIds = (paused.ok && Array.isArray(paused.data?.results)) ? paused.data.results : [];
    const pausedCount = paused.data?.paging?.total ?? pausedIds.length;

    let pausedItems = [];
    if (pausedIds.length) {
      const ids = pausedIds.slice(0, 10).join(',');
      const det = await jget(`${API}/items?ids=${ids}&attributes=id,title,available_quantity`, token);
      if (det.ok && Array.isArray(det.data)) {
        pausedItems = det.data.map(e => e?.body).filter(Boolean)
          .map(b => ({ id: b.id, title: b.title, stock: b.available_quantity }));
      }
    }

    return res.status(200).json({
      account_id: accountId,
      ml_user_id: userId,
      date: ymd,
      today: {
        count:    ord.data?.paging?.total ?? orders.length,
        units,
        revenue:  round2(revenue),
        fees:     round2(fees),
        net:      round2(revenue - fees),
        currency: 'BRL',
      },
      sales,
      paused: { count: pausedCount, items: pausedItems },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar vendas de hoje: ' + (err.message || 'desconhecido') });
  }
}
