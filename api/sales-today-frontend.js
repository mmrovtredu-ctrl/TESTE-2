/*
  js/sales-today.js
  -----------------
  Painel "Vendas de hoje" (tempo real) na Visão geral.
  Mostra, da conta selecionada:
    - Vendas de hoje (qtd e unidades), Faturamento, Recebido após taxa ML, Pausados
    - Lista de cada venda: hora, produto, qtd, valor e ESTOQUE ATUAL do item
    - Lista de anúncios pausados

  "Tempo real": atualiza sozinho a cada 60s e ao trocar de conta.
  (O ML não envia dados sozinho; por isso usamos atualização periódica.)

  Depende de: /api/sales-today, getCurrentAccountId(), formatCurrency(),
  formatNumber() e dos elementos #salesTodayBody / #salesTodayUpdated no HTML.
*/

let _salesTodayTimer = null;

function stCur(v) { return (typeof formatCurrency === 'function') ? formatCurrency(v) : 'R$ ' + v; }
function stNum(v) { return (typeof formatNumber === 'function') ? formatNumber(v) : v; }

function stHora(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stAgora() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function loadSalesToday() {
  const body = document.getElementById('salesTodayBody');
  const upd  = document.getElementById('salesTodayUpdated');
  if (!body) return;

  const accountId = (typeof getCurrentAccountId === 'function') ? getCurrentAccountId() : 'acc_1';

  // Só mostra spinner na primeira carga (refresh silencioso depois)
  if (!body.dataset.loaded) {
    body.innerHTML = `<div class="loading-row"><span class="spinner"></span><span>Carregando vendas de hoje…</span></div>`;
  }

  try {
    const res  = await fetch(`/api/sales-today?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok || data.not_connected) { renderSalesTodayNotConnected(accountId); return; }

    renderSalesToday(data);
    body.dataset.loaded = '1';
    if (upd) upd.textContent = `tempo real · atualizado às ${stAgora()}`;
  } catch (e) {
    if (upd) upd.textContent = 'falha ao atualizar — tentando de novo…';
  }
}

function renderSalesTodayNotConnected(accountId) {
  const accounts = window._mlAccounts || [];
  const name = accounts.find(a => a.account_id === accountId)?.account_name || accountId;
  const body = document.getElementById('salesTodayBody');
  body.dataset.loaded = '';
  body.innerHTML = `<p style="padding:16px;text-align:center;">⚠️ A loja <strong>${name}</strong> não está conectada.</p>`;
}

function renderSalesToday(data) {
  const t      = data.today || {};
  const sales  = data.sales || [];
  const paused = data.paused || { count: 0, items: [] };

  const kpis = `
    <div class="kpi-grid kpi-grid--compact" style="margin-bottom:var(--space-md);">
      <article class="kpi-card">
        <span class="kpi-card__label">Vendas hoje</span>
        <strong class="kpi-card__value">${stNum(t.count || 0)}</strong>
        <span class="kpi-card__trend">${stNum(t.units || 0)} un.</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-card__label">Faturamento hoje</span>
        <strong class="kpi-card__value">${stCur(t.revenue || 0)}</strong>
      </article>
      <article class="kpi-card">
        <span class="kpi-card__label">Recebido após taxa ML</span>
        <strong class="kpi-card__value">${stCur(t.net || 0)}</strong>
        <span class="kpi-card__trend">taxa ${stCur(t.fees || 0)}</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-card__label">Anúncios pausados</span>
        <strong class="kpi-card__value">${stNum(paused.count || 0)}</strong>
      </article>
    </div>`;

  let salesTable;
  if (!sales.length) {
    salesTable = `<p class="form-hint" style="padding:8px 0;">Nenhuma venda registrada hoje ainda. Assim que cair um pedido pago, ele aparece aqui.</p>`;
  } else {
    const rows = sales.map(s => `
      <tr>
        <td>${stHora(s.time)}</td>
        <td>${s.product}</td>
        <td>${stNum(s.units || 0)}</td>
        <td>${stCur(s.amount || 0)}</td>
        <td>${s.stock == null ? '—' : (s.stock === 0 ? '<span class="tag tag--danger">0</span>' : stNum(s.stock))}</td>
      </tr>`).join('');
    salesTable = `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Hora</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Estoque atual</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  let pausedBlock = '';
  if (paused.items && paused.items.length) {
    pausedBlock = `
      <div style="margin-top:var(--space-md);">
        <span class="panel__hint">Pausados nesta conta (${stNum(paused.count)})</span>
        <ul class="product-list" style="margin-top:6px;">
          ${paused.items.map(p => `
            <li>
              <span class="product-list__name">${p.title}</span>
              <span class="product-list__meta">${p.stock === 0 ? 'sem estoque' : stNum(p.stock) + ' un.'}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  const note = `<p class="form-hint" style="margin-top:var(--space-md);">
    "Recebido após taxa ML" já desconta a comissão do Mercado Livre. O <strong>lucro real</strong>
    depende do custo do produto (que o ML não armazena) — dá para cadastrar o custo depois e
    calcular o lucro líquido por venda.
  </p>`;

  document.getElementById('salesTodayBody').innerHTML = kpis + salesTable + pausedBlock + note;
}

function initSalesToday() {
  loadSalesToday();

  if (_salesTodayTimer) clearInterval(_salesTodayTimer);
  _salesTodayTimer = setInterval(loadSalesToday, 60000); // atualiza a cada 60s

  document.addEventListener('accountChanged', () => {
    const body = document.getElementById('salesTodayBody');
    if (body) body.dataset.loaded = '';
    loadSalesToday();
  });
}
