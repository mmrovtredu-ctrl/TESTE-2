/*
  js/catalog.js — versão REAL (sem mock)
  Chama /api/catalog?account_id=X e exibe os produtos reais do ML.
*/

let catalogData = [];

function renderCatalogKpis(products) {
  const active     = products.filter(p => p.status === 'ativo').length;
  const outOfStock = products.filter(p => p.status === 'sem_estoque' || p.stock === 0).length;
  const totalSales = products.reduce((s, p) => s + (p.sales30d || 0), 0);
  const avgHealth  = products.length
    ? Math.round(products.reduce((s, p) => s + (p.health || 0), 0) / products.length)
    : 0;

  document.getElementById('catalogActiveCount').textContent     = active;
  document.getElementById('catalogOutOfStockCount').textContent = outOfStock;
  document.getElementById('catalogTotalSales').textContent      = formatNumber(totalSales);
  document.getElementById('catalogAvgHealth').textContent       = avgHealth + '%';
}

function catalogStatusTag(status) {
  const map = {
    ativo:       { label: 'Ativo',       cls: 'tag--ok'     },
    sem_estoque: { label: 'Sem estoque', cls: 'tag--danger' },
    pausado:     { label: 'Pausado',     cls: 'tag--warn'   },
    encerrado:   { label: 'Encerrado',   cls: ''            },
    under_review:{ label: 'Em análise',  cls: 'tag--warn'   },
  };
  const info = map[status] || { label: status, cls: '' };
  return `<span class="tag ${info.cls}">${info.label}</span>`;
}

function catalogHealthTag(health) {
  if (!health || health <= 0) return '—';
  const pct = health <= 1 ? Math.round(health * 100) : Math.round(health);
  const cls = pct < 60 ? 'tag--danger' : pct < 80 ? 'tag--warn' : 'tag--ok';
  return `<span class="tag ${cls}">${pct}%</span>`;
}

function renderCatalogTable(products) {
  const tbody = document.querySelector('#catalogTable tbody');
  tbody.innerHTML = '';
  document.getElementById('catalogResultCount').textContent = `${products.length} produto(s)`;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-text-muted);">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  products.forEach(p => {
    const tr  = document.createElement('tr');
    const img = p.thumbnail
      ? `<img src="${p.thumbnail}" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:4px;margin-right:8px;vertical-align:middle;">`
      : '';
    tr.innerHTML = `
      <td>${img}${p.name}</td>
      <td>${p.category || '—'}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock === 0 ? '<span class="tag tag--danger">0</span>' : formatNumber(p.stock)}</td>
      <td>${formatNumber(p.sales30d || 0)}</td>
      <td>${formatNumber(p.visits30d || 0)}</td>
      <td>${catalogHealthTag(p.health)}</td>
      <td>${catalogStatusTag(p.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function applyCatalogFilters() {
  const query  = document.getElementById('catalogSearchInput').value.trim().toLowerCase();
  const status = document.getElementById('catalogStatusFilter').value;

  let filtered = catalogData;
  if (query)  filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || (p.category || '').toLowerCase().includes(query));
  if (status) filtered = filtered.filter(p => p.status === status);

  renderCatalogTable(filtered);
}

async function loadCatalog() {
  const accountId = getCurrentAccountId();

  // Estado de carregamento
  ['catalogActiveCount','catalogOutOfStockCount','catalogTotalSales','catalogAvgHealth']
    .forEach(id => { document.getElementById(id).textContent = '…'; });
  document.getElementById('catalogResultCount').textContent = '…';
  document.querySelector('#catalogTable tbody').innerHTML = `
    <tr><td colspan="8" style="text-align:center;padding:32px;">
      <div class="loading-row" style="justify-content:center;">
        <span class="spinner"></span>
        <span>Carregando catálogo do Mercado Livre…</span>
      </div>
    </td></tr>`;

  try {
    const res  = await fetch(`/api/catalog?account_id=${accountId}`);
    const data = await res.json();

    if (!res.ok) {
      if (data.not_connected) {
        showCatalogNotConnected(accountId);
        return;
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    catalogData = data.products || [];

    // Salva em cache para o módulo de concorrentes usar
    if (!window._catalogCache) window._catalogCache = {};
    window._catalogCache[accountId] = catalogData;

    renderCatalogKpis(catalogData);
    applyCatalogFilters();

  } catch (err) {
    console.warn('[catalog] API falhou:', err.message);
    document.querySelector('#catalogTable tbody').innerHTML = `
      <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-text-muted);">
        Erro ao carregar catálogo. Verifique a conexão da conta.
      </td></tr>`;
    ['catalogActiveCount','catalogOutOfStockCount','catalogTotalSales','catalogAvgHealth']
      .forEach(id => { document.getElementById(id).textContent = '—'; });
  }
}

function showCatalogNotConnected(accountId) {
  const accounts = window._mlAccounts || [];
  const account  = accounts.find(a => a.account_id === accountId);
  const name     = account?.account_name || accountId;

  ['catalogActiveCount','catalogOutOfStockCount','catalogTotalSales','catalogAvgHealth']
    .forEach(id => { document.getElementById(id).textContent = '—'; });
  document.getElementById('catalogResultCount').textContent = '—';
  document.querySelector('#catalogTable tbody').innerHTML = `
    <tr><td colspan="8" style="text-align:center;padding:24px;">
      ⚠️ A loja <strong>${name}</strong> ainda não está conectada.<br>
      <span style="font-size:0.85rem;color:var(--color-text-muted)">Clique em "🔗 Conectar ML" no topo.</span>
    </td></tr>`;
}

function initCatalog() {
  loadCatalog();
  document.getElementById('refreshCatalog').addEventListener('click', loadCatalog);
  document.getElementById('catalogSearchInput').addEventListener('input', applyCatalogFilters);
  document.getElementById('catalogStatusFilter').addEventListener('change', applyCatalogFilters);
  document.addEventListener('accountChanged', loadCatalog);
}
