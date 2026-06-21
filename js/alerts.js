/*
  alerts.js
  ---------
  View "Alertas" — lê dados reais do Supabase.
  Tabelas: monitor_alerts, monitor_status (criadas via migração 001).

  O cron /api/monitor-cron (roda a cada 2h) popula essas tabelas.
  Este arquivo apenas exibe os dados.
*/

function formatDateTime(isoString) {
  const date = new Date(isoString);
  const pad  = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function alertIcon(type) {
  const icons = {
    price_drop:     '💲',
    out_of_stock:   '📦',
    back_in_stock:  '🔄',
    new_competitor: '🆕',
  };
  return icons[type] || '🔔';
}

function severityClass(severity) {
  const map = { alta: 'alert-item--high', media: 'alert-item--medium', baixa: 'alert-item--low' };
  return map[severity] || '';
}

async function fetchMonitorStatus(accountId) {
  try {
    const { data, error } = await supabaseClient
      .from('monitor_status')
      .select('*')
      .eq('account_id', accountId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchAlerts(accountId) {
  try {
    const { data, error } = await supabaseClient
      .from('monitor_alerts')
      .select('*')
      .eq('account_id', accountId)
      .order('checked_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function renderMonitorStatus() {
  const accountId = getCurrentAccountId();
  const box       = document.getElementById('monitorStatus');

  box.innerHTML = `<span class="form-hint">Carregando status...</span>`;

  const status = await fetchMonitorStatus(accountId);

  if (!status) {
    box.innerHTML = `
      <p class="form-hint">
        Monitoramento ainda não iniciado para esta conta.
        O cron roda automaticamente a cada 2 horas após a primeira execução.
      </p>`;
    return;
  }

  box.innerHTML = `
    <div class="monitor-status__grid">
      <div class="monitor-status__item">
        <span class="monitor-status__label">Última verificação</span>
        <strong>${status.last_check_at ? formatDateTime(status.last_check_at) : '—'}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Próxima verificação</span>
        <strong>${status.next_check_at ? formatDateTime(status.next_check_at) : '—'}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Produtos monitorados</span>
        <strong>${status.products_monitored ?? 0}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Concorrentes acompanhados</span>
        <strong>${status.competitors_tracked ?? 0}</strong>
      </div>
      <div class="monitor-status__item">
        <span class="monitor-status__label">Alertas (24h)</span>
        <strong>${status.alerts_last_24h ?? 0}</strong>
      </div>
    </div>
  `;
}

async function renderAlertList() {
  const accountId = getCurrentAccountId();
  const list      = document.getElementById('alertList');

  list.innerHTML = `<li class="alert-item"><div class="alert-item__body"><span class="alert-item__title">Carregando alertas...</span></div></li>`;

  const alerts = await fetchAlerts(accountId);

  list.innerHTML = '';

  if (alerts.length === 0) {
    list.innerHTML = `
      <li class="alert-item">
        <div class="alert-item__body">
          <span class="alert-item__title">Nenhum alerta por aqui</span>
          <span class="alert-item__meta">Você será notificado quando um concorrente baixar o preço ou ficar sem estoque.</span>
        </div>
      </li>`;
    updateAlertsBadge(0);
    return;
  }

  alerts.forEach(alert => {
    const li = document.createElement('li');
    li.className = `alert-item ${severityClass(alert.severity)}` + (alert.unread ? ' is-unread' : '');

    let valueChange = '';
    if (alert.type === 'price_drop') {
      valueChange = `${formatCurrency(alert.previous_value)} → ${formatCurrency(alert.current_value)}`;
    } else if (alert.type === 'out_of_stock') {
      valueChange = `${alert.previous_value} un. → 0 un.`;
    } else if (alert.type === 'back_in_stock') {
      valueChange = `0 un. → ${alert.current_value} un.`;
    }

    li.innerHTML = `
      <span class="alert-item__icon">${alertIcon(alert.type)}</span>
      <div class="alert-item__body">
        <span class="alert-item__title">${alert.product_name} — ${alert.competitor}</span>
        <span class="alert-item__meta">${alert.message}</span>
        ${valueChange ? `<span class="alert-item__meta">${valueChange} • Seu preço: ${formatCurrency(alert.your_price)}</span>` : ''}
        <span class="alert-item__meta">Verificado em ${formatDateTime(alert.checked_at)}</span>
      </div>
    `;
    list.appendChild(li);
  });

  const unreadCount = alerts.filter(a => a.unread).length;
  updateAlertsBadge(unreadCount);
}

function updateAlertsBadge(count) {
  const badge = document.getElementById('alertsCount');
  if (!badge) return;
  badge.textContent  = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

async function markAllAlertsRead() {
  const accountId = getCurrentAccountId();
  await supabaseClient
    .from('monitor_alerts')
    .update({ unread: false })
    .eq('account_id', accountId)
    .eq('unread', true);
  await renderAlertList();
}

function initAlerts() {
  renderMonitorStatus();
  renderAlertList();

  document.getElementById('markAllRead').addEventListener('click', markAllAlertsRead);

  document.getElementById('alertsBtn').addEventListener('click', () => {
    setActiveView('alerts');
  });

  document.addEventListener('accountChanged', () => {
    renderMonitorStatus();
    renderAlertList();
  });
}
