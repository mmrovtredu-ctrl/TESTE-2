/*
  js/campaigns.js — versão CORRIGIDA
  Bug fix: loadCampaigns() agora passa account_id corretamente para a API.
*/

function renderCampaignKpis(totals) {
  document.getElementById('campSpend').textContent  = formatCurrency(totals.totalSpend30d || 0);
  document.getElementById('campAcos').textContent   = totals.totalAcos ? totals.totalAcos.toFixed(1) + '%' : '—';
  document.getElementById('campClicks').textContent = formatNumber(totals.totalClicks || 0);
  document.getElementById('campCtr').textContent    = totals.totalCtr ? totals.totalCtr.toFixed(2) + '%' : '—';
}

function renderBestPerformer(best) {
  const box = document.getElementById('campBestPerformer');
  if (!best) { box.innerHTML = `<p class="form-hint">Nenhum dado de Product Ads disponível.</p>`; return; }
  box.innerHTML = `
    <div class="result-block__field"><span>Campanha</span><p>${best.name}</p></div>
    <div class="result-block__tags">
      <span class="tag tag--ok">ACOS ${best.acos.toFixed(1)}%</span>
      <span class="tag tag--ok">${formatNumber(best.conversions)} conversões</span>
      <span class="tag tag--warn">Investido ${formatCurrency(best.spend30d)}</span>
      <span class="tag tag--warn">Retorno ${formatCurrency(best.revenue30d)}</span>
    </div>
    <div class="result-block__field"><span>Oportunidade</span>
      <p>ACOS mais baixo da conta — considere aumentar o orçamento diário para escalar as vendas mantendo eficiência.</p>
    </div>`;
}

function renderWorstPerformer(worst) {
  const box = document.getElementById('campWorstPerformer');
  if (!worst) { box.innerHTML = `<p class="form-hint">Nenhum dado de Product Ads disponível.</p>`; return; }
  box.innerHTML = `
    <div class="result-block__field"><span>Campanha</span><p>${worst.name}</p></div>
    <div class="result-block__tags">
      <span class="tag tag--danger">ACOS ${worst.acos.toFixed(1)}%</span>
      <span class="tag tag--warn">${formatNumber(worst.conversions)} conversões</span>
      <span class="tag tag--warn">Investido ${formatCurrency(worst.spend30d)}</span>
      <span class="tag tag--warn">Retorno ${formatCurrency(worst.revenue30d)}</span>
    </div>
    <div class="result-block__field"><span>Problema</span>
      <p>ACOS acima da meta — revise o lance ou pause os anúncios com menor conversão antes de continuar investindo.</p>
    </div>`;
}

function renderSellerCampaignsTable(campaigns) {
  const container = document.getElementById('sellerCampaignsSection');
  if (!container) return;
  if (!campaigns || campaigns.length === 0) {
    container.innerHTML = `<p class="form-hint" style="padding:16px;">Nenhuma campanha de desconto ativa.</p>`;
    return;
  }
  const statusLabel = { pending: 'Agendada', started: 'Ativa', finished: 'Encerrada' };
  const statusClass = { pending: 'tag--warn', started: 'tag--ok', finished: '' };

  const rows = campaigns.map(c => {
    const itemRows = (c.items || []).map(item => `
      <div class="campaign-item">
        <span class="campaign-item__name">${item.title}</span>
        <span class="campaign-item__meta">
          ${item.discount > 0 ? `${item.discount}% de desconto` : ''}
          ${item.originalPrice > 0 ? ` • De ${formatCurrency(item.originalPrice)}` : ''}
          ${item.dealPrice > 0 ? ` por ${formatCurrency(item.dealPrice)}` : ''}
          • Status: ${item.status || '—'}
        </span>
      </div>`).join('');

    return `
      <tr class="campaign-row" data-id="${c.id}">
        <td>▸ ${c.name}</td><td>${c.itemCount}</td>
        <td>${formatDate(c.startDate)}</td><td>${formatDate(c.finishDate)}</td>
        <td><span class="tag ${statusClass[c.status] || ''}">${statusLabel[c.status] || c.status}</span></td>
      </tr>
      <tr class="campaign-detail-row is-hidden" data-detail="${c.id}">
        <td colspan="5" style="padding:0;border-bottom:1px solid var(--color-border);">
          <div class="campaign-items">${itemRows || '<div class="campaign-item"><span>Nenhum produto.</span></div>'}</div>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Campanha</th><th>Produtos</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  container.querySelectorAll('.campaign-row').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      const detail = container.querySelector(`[data-detail="${tr.dataset.id}"]`);
      if (!detail) return;
      detail.classList.toggle('is-hidden');
      const cell = tr.querySelector('td:first-child');
      cell.textContent = detail.classList.contains('is-hidden')
        ? cell.textContent.replace('▾', '▸')
        : cell.textContent.replace('▸', '▾');
    });
  });
}

function renderProductAdsTable(adCampaigns) {
  const tbody = document.querySelector('#campaignsTable tbody');
  tbody.innerHTML = '';
  if (!adCampaigns || adCampaigns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted);">
      Nenhuma campanha de Product Ads encontrada.<br>
      <span style="font-size:0.8rem;">Crie em <a href="https://anunciosproduto.mercadolivre.com.br" target="_blank" rel="noopener">anunciosproduto.mercadolivre.com.br</a></span>
    </td></tr>`;
    return;
  }
  adCampaigns.forEach(c => {
    const statusClass = c.status === 'active' ? 'tag--ok' : c.status === 'paused' ? 'tag--warn' : '';
    const acosClass   = c.acos === 0 ? '' : c.acos <= 15 ? 'tag--ok' : c.acos <= 25 ? 'tag--warn' : 'tag--danger';
    const statusLabel = { active: 'Ativa', paused: 'Pausada', archived: 'Arquivada' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${formatCurrency(c.spend30d)}</td>
      <td>${formatNumber(c.clicks)}</td>
      <td>${formatNumber(c.impressions)}</td>
      <td>${formatNumber(c.conversions)}</td>
      <td>${c.acos > 0 ? `<span class="tag ${acosClass}">${c.acos.toFixed(1)}%</span>` : '—'}</td>
      <td><span class="tag ${statusClass}">${statusLabel[c.status] || c.status}</span></td>`;
    tbody.appendChild(tr);
  });
}

function buildRecommendations(adCampaigns, sellerCampaigns) {
  const recs = [];
  if (adCampaigns && adCampaigns.length > 0) {
    adCampaigns.filter(c => c.acos > 25 && c.spend30d > 0).forEach(c => {
      recs.push(`"${c.name}" está com ACOS de ${c.acos.toFixed(1)}%, acima do ideal (25%). Considere reduzir o lance ou revisar os produtos incluídos.`);
    });
    const best = [...adCampaigns].filter(c => c.acos > 0).sort((a, b) => a.acos - b.acos)[0];
    if (best) recs.push(`"${best.name}" tem o melhor ACOS (${best.acos.toFixed(1)}%). Aumentar o orçamento diário pode trazer mais vendas sem perder eficiência.`);
    const paused = adCampaigns.filter(c => c.status === 'paused');
    if (paused.length > 0) recs.push(`Você tem ${paused.length} campanha(s) pausada(s). Revise se ainda fazem sentido ou reative para ganhar visibilidade.`);
  }
  const activeSeller = (sellerCampaigns || []).filter(c => c.status === 'started');
  if (activeSeller.length > 0) recs.push(`${activeSeller.length} campanha(s) de desconto ativa(s): ${activeSeller.map(c => `"${c.name}"`).join(', ')}.`);
  if (recs.length === 0) recs.push('Nenhuma campanha de Product Ads encontrada. Crie campanhas no Gerenciador de Anúncios do Mercado Livre para aumentar a visibilidade dos seus produtos.');
  return recs;
}

function renderRecommendations(recs) {
  const list = document.getElementById('recommendationList');
  list.innerHTML = '';
  recs.forEach(rec => { const li = document.createElement('li'); li.textContent = rec; list.appendChild(li); });
}

function ensureSellerCampaignsSection() {
  if (document.getElementById('sellerCampaignsSection')) return;
  const productAdsPanel = document.querySelector('#view-campaigns .panel:has(#campaignsTable)');
  const section = document.createElement('div');
  section.className = 'panel';
  section.innerHTML = `
    <div class="panel__header">
      <h2>🏷️ Campanhas de desconto</h2>
      <span class="panel__hint">Promoções de preço do vendedor</span>
    </div>
    <div id="sellerCampaignsSection"></div>`;
  if (productAdsPanel) productAdsPanel.parentNode.insertBefore(section, productAdsPanel);
  else document.getElementById('view-campaigns').appendChild(section);
}

// ── CARREGAMENTO PRINCIPAL — BUG FIX: account_id passado corretamente ─────────
async function loadCampaigns() {
  const accountId = getCurrentAccountId(); // ✅ lê a conta selecionada
  ensureSellerCampaignsSection();

  renderCampaignKpis({ totalSpend30d: 0, totalAcos: 0, totalClicks: 0, totalCtr: 0 });
  const sel = document.getElementById('sellerCampaignsSection');
  if (sel) sel.innerHTML = `<div class="loading-row" style="padding:16px;"><span class="spinner"></span><span>Carregando campanhas…</span></div>`;

  try {
    // ✅ passa account_id na query string
    const res  = await fetch(`/api/campaigns?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok) {
      if (data.not_connected) { showCampaignsNotConnected(accountId); return; }
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const { campaigns: sellerCampaigns = [], ads } = data;

    if (ads?.totals) renderCampaignKpis(ads.totals);
    const adCampaigns = ads?.campaigns || [];
    renderProductAdsTable(adCampaigns);

    const activeAds = adCampaigns.filter(c => c.acos > 0 && c.spend30d > 0);
    if (activeAds.length > 0) {
      const sorted = [...activeAds].sort((a, b) => a.acos - b.acos);
      renderBestPerformer(sorted[0]);
      renderWorstPerformer(sorted[sorted.length - 1]);
    } else {
      renderBestPerformer(null);
      renderWorstPerformer(null);
    }

    renderSellerCampaignsTable(sellerCampaigns);
    renderRecommendations(buildRecommendations(adCampaigns, sellerCampaigns));

  } catch (err) {
    console.warn('[campaigns] API falhou:', err.message);
    if (sel) sel.innerHTML = `<p class="form-hint" style="padding:16px;">Não foi possível carregar campanhas. Verifique a conexão da conta.</p>`;
    renderProductAdsTable([]);
    renderBestPerformer(null);
    renderWorstPerformer(null);
    renderRecommendations(['Conecte sua conta ao Mercado Livre para ver as campanhas.']);
  }
}

function showCampaignsNotConnected(accountId) {
  const accounts = window._mlAccounts || [];
  const account  = accounts.find(a => a.account_id === accountId);
  const name     = account?.account_name || accountId;
  renderCampaignKpis({ totalSpend30d: 0, totalAcos: 0, totalClicks: 0, totalCtr: 0 });
  renderBestPerformer(null);
  renderWorstPerformer(null);
  const sel = document.getElementById('sellerCampaignsSection');
  if (sel) sel.innerHTML = `<p style="padding:16px;text-align:center;">⚠️ A loja <strong>${name}</strong> ainda não está conectada.</p>`;
  const tbody = document.querySelector('#campaignsTable tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;">—</td></tr>`;
  renderRecommendations([]);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initCampaigns() {
  loadCampaigns();
  document.addEventListener('accountChanged', loadCampaigns);
}
