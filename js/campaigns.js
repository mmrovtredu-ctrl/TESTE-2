/*
  js/campaigns.js — versão SÓ CAMPANHAS DE DESCONTO
  Toda a aba é baseada nas promoções do vendedor (/api/campaigns -> campaigns).
  Remove os blocos de Product Ads; os 4 indicadores do topo passam a ser
  números das campanhas de desconto.
*/

// ── Rótulos amigáveis ─────────────────────────────────────────
const PROMO_TYPE_LABEL = {
  DEAL: 'Oferta',
  LIGHTNING: 'Relâmpago',
  DOD: 'Oferta do dia',
  SMART: 'Cofinanciada',
  PRICE_MATCHING: 'Preços competitivos',
  SELLER_CAMPAIGN: 'Campanha própria',
  VOLUME: 'Leve mais, pague menos',
  PRICE_DISCOUNT: 'Desconto individual',
  PRE_NEGOTIATED: 'Pré-acordada',
  MARKETPLACE_CAMPAIGN: 'Cofinanciada',
  UNHEALTHY_STOCK: 'Liquidação Full',
  SELLER_COUPON_CAMPAIGN: 'Cupom',
};
const STATUS_LABEL = { started: 'Ativa', pending: 'Agendada', finished: 'Encerrada' };
const STATUS_CLASS = { started: 'tag--ok', pending: 'tag--warn', finished: '' };

function fmtCur(v) { return (typeof formatCurrency === 'function') ? formatCurrency(v) : `R$ ${v}`; }
function fmtNum(v) { return (typeof formatNumber === 'function') ? formatNumber(v) : v; }

function campFormatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Ajusta a tela uma vez: rótulos, esconde Product Ads ───────
function adaptCampaignsLayout() {
  // Subtítulo
  const sub = document.querySelector('#view-campaigns .view__subtitle');
  if (sub) sub.textContent = 'Suas campanhas de desconto no Mercado Livre — ofertas, relâmpago, cofinanciadas e próprias';

  // Esconde os painéis de "melhor/pior desempenho" (eram de Ads)
  const bestBox = document.getElementById('campBestPerformer');
  if (bestBox) { const g = bestBox.closest('.grid-2'); if (g) g.style.display = 'none'; }

  // Reaproveita o painel da tabela de Ads como a lista de campanhas de desconto
  const adsTable = document.getElementById('campaignsTable');
  if (adsTable) {
    const panel = adsTable.closest('.panel');
    if (panel) {
      const h2 = panel.querySelector('.panel__header h2');
      if (h2) h2.textContent = 'Suas campanhas de desconto';
      const hint = panel.querySelector('.panel__hint');
      if (hint) hint.textContent = 'Clique numa campanha para ver os produtos';
      // troca o conteúdo do painel por um container que vamos preencher
      const scroll = panel.querySelector('.table-scroll');
      if (scroll) { scroll.id = 'discountCampaignsBox'; scroll.innerHTML = ''; }
    }
  }
}

// ── KPIs do topo (reaproveita os 4 cards) ─────────────────────
function setKpi(valueId, label, value) {
  const valEl = document.getElementById(valueId);
  if (!valEl) return;
  valEl.textContent = value;
  const card = valEl.closest('.kpi-card');
  const labelEl = card?.querySelector('.kpi-card__label');
  if (labelEl) labelEl.textContent = label;
}

function renderDiscountKpis(campaigns) {
  const active = campaigns.filter(c => c.status === 'started').length;
  const pending = campaigns.filter(c => c.status === 'pending').length;

  // descontos a partir dos itens carregados que têm desconto real
  const discounts = [];
  campaigns.forEach(c => (c.items || []).forEach(it => {
    if (it.discount > 0) discounts.push(it.discount);
  }));
  const avgDisc = discounts.length
    ? Math.round(discounts.reduce((s, d) => s + d, 0) / discounts.length) : 0;
  const maxDisc = discounts.length ? Math.max(...discounts) : 0;

  setKpi('campSpend', 'Campanhas ativas', active);
  setKpi('campAcos', 'Agendadas', pending);
  setKpi('campClicks', 'Desconto médio', avgDisc ? avgDisc + '%' : '—');
  setKpi('campCtr', 'Maior desconto', maxDisc ? maxDisc + '%' : '—');
}

// ── Tabela das campanhas de desconto (expansível) ─────────────
function renderDiscountCampaigns(campaigns) {
  const box = document.getElementById('discountCampaignsBox')
           || document.querySelector('#campaignsTable')?.closest('.panel');
  if (!box) return;

  if (!campaigns.length) {
    box.innerHTML = `<p class="form-hint" style="padding:16px;">Nenhuma campanha de desconto no momento.</p>`;
    return;
  }

  // ordena: ativas primeiro, depois agendadas
  const order = { started: 0, pending: 1, finished: 2 };
  const sorted = campaigns.slice().sort((a, b) =>
    (order[a.status] ?? 3) - (order[b.status] ?? 3));

  const rows = sorted.map(c => {
    const typeLabel = PROMO_TYPE_LABEL[c.type] || c.type;
    const stLabel = STATUS_LABEL[c.status] || c.status;
    const stClass = STATUS_CLASS[c.status] || '';

    const itemRows = (c.items || []).map(it => {
      const hasDeal = it.dealPrice > 0;
      const meta = hasDeal
        ? `<span class="tag tag--ok">${it.discount}% OFF</span>
           <span class="campaign-item__meta">De ${fmtCur(it.originalPrice)} por <strong>${fmtCur(it.dealPrice)}</strong></span>`
        : `<span class="campaign-item__meta" style="color:var(--color-text-muted);">Convidado — desconto ainda não definido</span>`;
      return `<div class="campaign-item" style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--color-border);">
        <span class="campaign-item__name" style="flex:1;">${it.title}</span>
        <span style="white-space:nowrap;display:flex;gap:8px;align-items:center;">${meta}</span>
      </div>`;
    }).join('');

    const extra = c.itemCount > (c.items?.length || 0)
      ? `<div style="padding:8px 0;color:var(--color-text-muted);font-size:0.82rem;">+ ${c.itemCount - c.items.length} outros produtos nesta campanha</div>`
      : '';

    return `
      <tr class="campaign-row" data-id="${c.id}" style="cursor:pointer;">
        <td>▸ ${c.name}</td>
        <td><span class="tag">${typeLabel}</span></td>
        <td>${fmtNum(c.itemCount)}</td>
        <td>${campFormatDate(c.startDate)}</td>
        <td>${campFormatDate(c.finishDate)}</td>
        <td><span class="tag ${stClass}">${stLabel}</span></td>
      </tr>
      <tr class="campaign-detail-row is-hidden" data-detail="${c.id}">
        <td colspan="6" style="padding:0 12px;background:var(--color-bg-elevated,#0f1b29);">
          <div class="campaign-items" style="padding:8px 0;">${itemRows || '<div style="padding:8px 0;">Sem produtos.</div>'}${extra}</div>
        </td>
      </tr>`;
  }).join('');

  box.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Campanha</th><th>Tipo</th><th>Produtos</th><th>Início</th><th>Fim</th><th>Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  box.querySelectorAll('.campaign-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const detail = box.querySelector(`[data-detail="${tr.dataset.id}"]`);
      if (!detail) return;
      detail.classList.toggle('is-hidden');
      const cell = tr.querySelector('td:first-child');
      cell.textContent = detail.classList.contains('is-hidden')
        ? cell.textContent.replace('▾', '▸')
        : cell.textContent.replace('▸', '▾');
    });
  });
}

// ── Recomendações (baseadas nas campanhas de desconto) ────────
function renderDiscountRecommendations(campaigns) {
  const list = document.getElementById('recommendationList');
  if (!list) return;
  const recs = [];

  const active = campaigns.filter(c => c.status === 'started');
  const pending = campaigns.filter(c => c.status === 'pending');

  if (active.length) recs.push(`Você tem ${active.length} campanha(s) de desconto ativa(s) agora.`);
  if (pending.length) recs.push(`${pending.length} campanha(s) agendada(s) vão começar em breve — revise os produtos e preços antes de iniciarem.`);

  // campanhas em que você foi convidado mas não adicionou produtos (itens sem desconto)
  const semProdutos = active.filter(c =>
    (c.items || []).length > 0 && c.items.every(it => !(it.dealPrice > 0)));
  semProdutos.forEach(c => {
    recs.push(`Na campanha "${c.name}" você foi convidado mas ainda não definiu descontos — adicione produtos para participar.`);
  });

  // maior campanha por nº de produtos
  const biggest = campaigns.slice().sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0))[0];
  if (biggest && biggest.itemCount > 0) {
    recs.push(`Sua maior campanha é "${biggest.name}" com ${biggest.itemCount} produtos.`);
  }

  if (!recs.length) recs.push('Nenhuma campanha de desconto ativa no momento. Crie ou aceite uma promoção no Mercado Livre para impulsionar as vendas.');

  list.innerHTML = '';
  recs.forEach(r => { const li = document.createElement('li'); li.textContent = r; list.appendChild(li); });
}

function showCampaignsNotConnected(accountId) {
  const accounts = window._mlAccounts || [];
  const name = accounts.find(a => a.account_id === accountId)?.account_name || accountId;
  setKpi('campSpend', 'Campanhas ativas', '—');
  setKpi('campAcos', 'Agendadas', '—');
  setKpi('campClicks', 'Desconto médio', '—');
  setKpi('campCtr', 'Maior desconto', '—');
  const box = document.getElementById('discountCampaignsBox');
  if (box) box.innerHTML = `<p style="padding:16px;text-align:center;">⚠️ A loja <strong>${name}</strong> ainda não está conectada.</p>`;
  const list = document.getElementById('recommendationList');
  if (list) list.innerHTML = '';
}

// ── Carregamento principal ────────────────────────────────────
async function loadCampaigns() {
  adaptCampaignsLayout();
  const accountId = (typeof getCurrentAccountId === 'function') ? getCurrentAccountId() : 'acc_1';

  const box = document.getElementById('discountCampaignsBox');
  if (box) box.innerHTML = `<div class="loading-row" style="padding:16px;"><span class="spinner"></span><span>Carregando campanhas de desconto…</span></div>`;

  try {
    const res = await fetch(`/api/campaigns?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok || data.not_connected) {
      showCampaignsNotConnected(accountId);
      return;
    }

    const campaigns = data.campaigns || [];
    renderDiscountKpis(campaigns);
    renderDiscountCampaigns(campaigns);
    renderDiscountRecommendations(campaigns);
  } catch (err) {
    console.warn('[campaigns] falhou:', err.message);
    if (box) box.innerHTML = `<p class="form-hint" style="padding:16px;">Não foi possível carregar as campanhas. Verifique a conexão da conta.</p>`;
  }
}

function initCampaigns() {
  loadCampaigns();
  document.addEventListener('accountChanged', loadCampaigns);
}
