const html = /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Super Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; font-size: 14px; background: #f5f5f5; color: #222; padding: 24px; }
    h1 { font-size: 1.4rem; margin-bottom: 24px; }
    h2 { font-size: 1.1rem; margin-bottom: 12px; }
    section { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 20px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    tr:hover td { background: #fafafa; }
    button { cursor: pointer; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-success { background: #16a34a; color: #fff; }
    .btn-success:hover { background: #15803d; }
    .btn-warning { background: #d97706; color: #fff; }
    .btn-warning:hover { background: #b45309; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-sm { padding: 3px 8px; font-size: 12px; }
    form { display: flex; flex-direction: column; gap: 10px; max-width: 460px; margin-top: 14px; }
    label { display: flex; flex-direction: column; gap: 3px; font-size: 13px; font-weight: 500; }
    input { border: 1px solid #ccc; border-radius: 4px; padding: 6px 8px; font-size: 13px; }
    input:focus { outline: 2px solid #2563eb; }
    details summary { cursor: pointer; font-weight: 600; color: #2563eb; margin-bottom: 4px; }
    #login-section { max-width: 360px; margin: 80px auto; }
    #login-section h1 { text-align: center; }
    #error-msg { color: #dc2626; font-size: 13px; min-height: 18px; }
    .status-active { color: #16a34a; font-weight: 600; }
    .status-inactive { color: #6b7280; }
    .status-error { color: #dc2626; font-weight: 600; }
    .actions { display: flex; gap: 6px; }
    .logout-btn { float: right; margin-top: -4px; }
    .queue-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 20px; }
    .queue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .queue-stat { display: flex; flex-direction: column; gap: 4px; }
    .queue-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .queue-value { font-size: 1.4rem; font-weight: 700; color: #1e293b; }
    .queue-sub { font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>

<div id="login-section">
  <h1>Super Admin</h1>
  <section>
    <form id="login-form">
      <label>Email <input type="email" id="email" required autocomplete="username" /></label>
      <label>Senha <input type="password" id="password" required autocomplete="current-password" /></label>
      <div id="error-msg"></div>
      <button type="submit" class="btn-primary">Entrar</button>
    </form>
  </section>
</div>

<div id="data-section" hidden>
  <h1>Super Admin <button class="btn-danger btn-sm logout-btn" id="logout-btn">Sair</button></h1>

  <!-- Tenants -->
  <section id="tenants-section">
    <h2>Tenants</h2>
    <table id="tenants-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Último Login</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="tenants-body">
        <tr><td colspan="5">Carregando...</td></tr>
      </tbody>
    </table>

    <details style="margin-top: 16px;">
      <summary>Novo Tenant</summary>
      <form id="new-tenant-form">
        <label>Nome <input type="text" name="name" required /></label>
        <label>Email <input type="email" name="email" required /></label>
        <label>Senha <input type="password" name="password" required /></label>
        <label>Pluggy Email <input type="email" name="pluggy_email" required /></label>
        <label>Pluggy Password <input type="password" name="pluggy_password" required /></label>
        <div id="tenant-form-error" style="color:#dc2626;font-size:13px;min-height:18px;"></div>
        <button type="submit" class="btn-success">Criar Tenant</button>
      </form>
    </details>
  </section>

  <!-- Workers -->
  <section id="workers-section">
    <h2>Workers (Enrich)</h2>

    <!-- Fila Enrich -->
    <div id="queue-card" class="queue-card">
      <div class="queue-grid">
        <div class="queue-stat">
          <span class="queue-label">Pendentes</span>
          <span class="queue-value" id="q-pending">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Executando</span>
          <span class="queue-value" id="q-running">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Concluídos</span>
          <span class="queue-value" id="q-done">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Erros</span>
          <span class="queue-value" id="q-error">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Erro atual</span>
          <span class="queue-value" id="q-error-rate-current">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Erro histórico</span>
          <span class="queue-value" id="q-error-rate-hist">—</span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">ETA</span>
          <span class="queue-value" id="q-eta">—</span>
          <span class="queue-sub" id="q-eta-source"></span>
        </div>
        <div class="queue-stat">
          <span class="queue-label">Throughput</span>
          <span class="queue-value" id="q-throughput">—</span>
        </div>
      </div>
    </div>

    <table id="workers-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>URL</th>
          <th>Status</th>
          <th>Erros</th>
          <th>Média (7d)</th>
          <th>Mediana (7d)</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="workers-body">
        <tr><td colspan="7">Carregando...</td></tr>
      </tbody>
    </table>

    <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">
      <strong>Média:</strong> soma dos tempos de todos os jobs dividida pela quantidade — sensível a outliers (ex: timeouts).
      <strong>Mediana:</strong> tempo do job do meio na distribuição — mais representativa do caso típico.
    </p>

    <details style="margin-top: 16px;">
      <summary>Novo Worker</summary>
      <form id="new-worker-form">
        <label>Nome <input type="text" name="name" required /></label>
        <label>AI Base URL <input type="url" name="ai_base_url" required /></label>
        <label>AI API Key <input type="password" name="ai_api_key" required /></label>
        <label>AI Model <input type="text" name="ai_model" required /></label>
        <div id="worker-form-error" style="color:#dc2626;font-size:13px;min-height:18px;"></div>
        <button type="submit" class="btn-success">Criar Worker</button>
      </form>
    </details>
  </section>

  <!-- Digest Queue -->
  <section id="digest-queue-section">
    <h2>Digest Queue</h2>
    <div class="queue-card">
      <div class="queue-grid">
        <div class="queue-stat"><span class="queue-label">Pendentes</span><span class="queue-value" id="dq-pending">—</span></div>
        <div class="queue-stat"><span class="queue-label">Executando</span><span class="queue-value" id="dq-running">—</span></div>
        <div class="queue-stat"><span class="queue-label">Concluídos</span><span class="queue-value" id="dq-done">—</span></div>
        <div class="queue-stat"><span class="queue-label">Erros</span><span class="queue-value" id="dq-error">—</span></div>
        <div class="queue-stat"><span class="queue-label">Ignorados</span><span class="queue-value" id="dq-skipped">—</span></div>
      </div>
      <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px;">
        <button class="btn-primary" id="digest-enqueue-btn">Enqueue Digest</button>
        <span id="digest-enqueue-msg" style="font-size: 13px; color: #16a34a;"></span>
      </div>
    </div>
  </section>

  <!-- Forecast Queue -->
  <section id="forecast-queue-section">
    <h2>Forecast Queue</h2>
    <div class="queue-card">
      <div class="queue-grid">
        <div class="queue-stat"><span class="queue-label">Pendentes</span><span class="queue-value" id="fq-pending">—</span></div>
        <div class="queue-stat"><span class="queue-label">Executando</span><span class="queue-value" id="fq-running">—</span></div>
        <div class="queue-stat"><span class="queue-label">Concluídos</span><span class="queue-value" id="fq-done">—</span></div>
        <div class="queue-stat"><span class="queue-label">Erros</span><span class="queue-value" id="fq-error">—</span></div>
      </div>
      <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px;">
        <button class="btn-primary" id="forecast-enqueue-btn">Enqueue Forecast</button>
        <span id="forecast-enqueue-msg" style="font-size: 13px; color: #16a34a;"></span>
      </div>
    </div>
  </section>

  <!-- ML Training Queue -->
  <section id="ml-queue-section">
    <h2>ML Training</h2>
    <div class="queue-card">
      <div class="queue-grid">
        <div class="queue-stat"><span class="queue-label">Pendentes</span><span class="queue-value" id="mlq-pending">—</span></div>
        <div class="queue-stat"><span class="queue-label">Executando</span><span class="queue-value" id="mlq-running">—</span></div>
        <div class="queue-stat"><span class="queue-label">Concluídos</span><span class="queue-value" id="mlq-done">—</span></div>
        <div class="queue-stat"><span class="queue-label">Erros</span><span class="queue-value" id="mlq-error">—</span></div>
      </div>
      <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px;">
        <button class="btn-primary" id="ml-enqueue-btn">Enqueue Training</button>
        <span id="ml-enqueue-msg" style="font-size: 13px; color: #16a34a;"></span>
      </div>
    </div>
  </section>
</div>

<script>
  const API = '';

  function getToken() { return localStorage.getItem('admin_token'); }
  function setToken(t) { localStorage.setItem('admin_token', t); }
  function clearToken() { localStorage.removeItem('admin_token'); }

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
  }

  function showLogin() {
    document.getElementById('login-section').hidden = false;
    document.getElementById('data-section').hidden = true;
  }

  function showData() {
    document.getElementById('login-section').hidden = true;
    document.getElementById('data-section').hidden = false;
    startWorkersRefresh();
  }

  async function handleUnauthorized() {
    clearToken();
    showLogin();
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('error-msg');
    errorEl.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const res = await fetch(API + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Credenciais inválidas';
        return;
      }
      const { token } = await res.json();
      setToken(token);
      showData();
      loadAll();
    } catch {
      errorEl.textContent = 'Erro de conexão';
    }
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken();
    stopWorkersRefresh();
    showLogin();
  });

  // ── Load all ───────────────────────────────────────────────────────────────
  async function loadAll() {
    await Promise.all([loadTenants(), loadWorkers(), loadQueueStats(), loadDigestStats(), loadForecastStats(), loadMlStats()]);
  }

  // ── Tenants ────────────────────────────────────────────────────────────────
  async function loadTenants() {
    const tbody = document.getElementById('tenants-body');
    tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
      const res = await fetch(API + '/api/admin/tenants', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const tenants = await res.json();
      renderTenants(tenants);
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar</td></tr>';
    }
  }

  function renderTenants(tenants) {
    const tbody = document.getElementById('tenants-body');
    if (!tenants.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum tenant cadastrado</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    for (const t of tenants) {
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      const lastLogin = t.last_login_at
        ? new Date(t.last_login_at).toLocaleString('pt-BR')
        : '—';
      const statusClass = t.status === 'active' ? 'status-active'
        : t.status === 'inactive' ? 'status-inactive' : 'status-inactive';
      const btnLabel = t.status === 'active' ? 'Desativar' : 'Ativar';
      const btnClass = t.status === 'active' ? 'btn-warning btn-sm' : 'btn-success btn-sm';
      tr.innerHTML =
        '<td>' + escHtml(t.name) + '</td>' +
        '<td>' + escHtml(t.email) + '</td>' +
        '<td>' + lastLogin + '</td>' +
        '<td><span class="' + statusClass + '">' + escHtml(t.status) + '</span></td>' +
        '<td><div class="actions"><button class="' + btnClass + ' toggle-tenant">' + btnLabel + '</button></div></td>';
      tr.querySelector('.toggle-tenant').addEventListener('click', () => toggleTenant(t.id, t.status, tr));
      tbody.appendChild(tr);
    }
  }

  async function toggleTenant(id, currentStatus, tr) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(API + '/api/admin/tenants/' + id, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) return;
      const updated = await res.json();
      const statusClass = updated.status === 'active' ? 'status-active' : 'status-inactive';
      tr.querySelector('span').className = statusClass;
      tr.querySelector('span').textContent = updated.status;
      const btn = tr.querySelector('.toggle-tenant');
      if (updated.status === 'active') {
        btn.textContent = 'Desativar';
        btn.className = 'btn-warning btn-sm toggle-tenant';
      } else {
        btn.textContent = 'Ativar';
        btn.className = 'btn-success btn-sm toggle-tenant';
      }
      // Update closure data
      btn.onclick = null;
      btn.addEventListener('click', () => toggleTenant(id, updated.status, tr));
    } catch { /* ignore */ }
  }

  document.getElementById('new-tenant-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('tenant-form-error');
    errorEl.textContent = '';
    const form = e.target;
    const body = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      pluggy_email: form.pluggy_email.value.trim(),
      pluggy_password: form.pluggy_password.value,
    };
    try {
      const res = await fetch(API + '/api/admin/tenants', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Erro ao criar tenant';
        return;
      }
      form.reset();
      form.closest('details').open = false;
      loadTenants();
    } catch {
      errorEl.textContent = 'Erro de conexão';
    }
  });

  // ── Workers ────────────────────────────────────────────────────────────────
  async function loadWorkers() {
    const tbody = document.getElementById('workers-body');
    tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    try {
      const res = await fetch(API + '/api/admin/workers', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const workers = await res.json();
      renderWorkers(workers);
    } catch {
      tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar</td></tr>';
    }
  }

  function fmtSecs(v) {
    if (v == null) return '\u2014';
    return parseFloat(v).toFixed(1).replace('.', ',') + 's';
  }

  function renderWorkers(workers) {
    const tbody = document.getElementById('workers-body');
    if (!workers.length) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhum worker cadastrado</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    for (const w of workers) {
      const tr = document.createElement('tr');
      tr.dataset.id = w.id;
      const statusClass = w.status === 'active' ? 'status-active'
        : w.status === 'error' ? 'status-error' : 'status-inactive';
      const canReactivate = w.status === 'inactive' || w.status === 'error';
      tr.innerHTML =
        '<td>' + escHtml(w.name) + '</td>' +
        '<td>' + escHtml(w.ai_base_url) + '</td>' +
        '<td><span class="' + statusClass + '">' + escHtml(w.status) + '</span></td>' +
        '<td>' + (w.error_count || 0) + '</td>' +
        '<td>' + fmtSecs(w.avg_duration_7d_secs) + '</td>' +
        '<td>' + fmtSecs(w.median_duration_7d_secs) + '</td>' +
        '<td><div class="actions">' +
          (canReactivate ? '<button class="btn-success btn-sm reactivate-worker">Reativar</button>' : '') +
          '<button class="btn-danger btn-sm remove-worker">Remover</button>' +
        '</div></td>';
      if (canReactivate) {
        tr.querySelector('.reactivate-worker').addEventListener('click', () => reactivateWorker(w.id, tr));
      }
      tr.querySelector('.remove-worker').addEventListener('click', () => removeWorker(w.id, tr));
      tbody.appendChild(tr);
    }
  }

  async function reactivateWorker(id, tr) {
    try {
      const res = await fetch(API + '/api/admin/workers/' + id, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) return;
      const updated = await res.json();
      const span = tr.querySelector('span');
      span.className = 'status-active';
      span.textContent = updated.status;
      const reactivateBtn = tr.querySelector('.reactivate-worker');
      if (reactivateBtn) reactivateBtn.remove();
    } catch { /* ignore */ }
  }

  async function removeWorker(id, tr) {
    try {
      const res = await fetch(API + '/api/admin/workers/' + id, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) return;
      tr.remove();
      if (!document.getElementById('workers-body').children.length) {
        document.getElementById('workers-body').innerHTML =
          '<tr><td colspan="7">Nenhum worker cadastrado</td></tr>';
      }
    } catch { /* ignore */ }
  }

  document.getElementById('new-worker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('worker-form-error');
    errorEl.textContent = '';
    const form = e.target;
    const body = {
      name: form.name.value.trim(),
      ai_base_url: form.ai_base_url.value.trim(),
      ai_api_key: form.ai_api_key.value,
      ai_model: form.ai_model.value.trim(),
    };
    try {
      const res = await fetch(API + '/api/admin/workers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Erro ao criar worker';
        return;
      }
      form.reset();
      form.closest('details').open = false;
      loadWorkers();
    } catch {
      errorEl.textContent = 'Erro de conexão';
    }
  });

  // ── Auto-refresh ───────────────────────────────────────────────────────────
  let workersRefreshInterval = null;
  let queueRefreshInterval = null;

  function startWorkersRefresh() {
    stopWorkersRefresh();
    workersRefreshInterval = setInterval(() => loadWorkers(), 30_000);
    queueRefreshInterval = setInterval(() => {
      loadQueueStats();
      loadDigestStats();
      loadForecastStats();
      loadMlStats();
    }, 30_000);
  }

  function stopWorkersRefresh() {
    if (workersRefreshInterval !== null) {
      clearInterval(workersRefreshInterval);
      workersRefreshInterval = null;
    }
    if (queueRefreshInterval !== null) {
      clearInterval(queueRefreshInterval);
      queueRefreshInterval = null;
    }
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function formatEta(seconds) {
    if (seconds == null) return '—';
    if (seconds < 60) return 'menos de 1 minuto';
    if (seconds < 3600) return Math.round(seconds / 60) + ' min';
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600);
      const m = Math.round((seconds % 3600) / 60);
      return h + 'h ' + m + 'min';
    }
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    return d + ' dias ' + h + 'h';
  }

  async function loadQueueStats() {
    try {
      const res = await fetch(API + '/api/admin/queue-stats', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const s = await res.json();
      document.getElementById('q-pending').textContent = s.pending.toLocaleString('pt-BR');
      document.getElementById('q-running').textContent = s.running.toLocaleString('pt-BR');
      document.getElementById('q-done').textContent = s.done.toLocaleString('pt-BR');
      document.getElementById('q-error').textContent = s.error.toLocaleString('pt-BR');
      document.getElementById('q-error-rate-current').textContent =
        (s.error_rate_current * 100).toFixed(1).replace('.', ',') + '%';
      document.getElementById('q-error-rate-hist').textContent =
        (s.error_rate_historical * 100).toFixed(1).replace('.', ',') + '%';
      document.getElementById('q-eta').textContent = formatEta(s.eta_seconds);
      const srcMap = { workers: 'por worker', global: 'global (fallback)', unavailable: 'sem dados' };
      document.getElementById('q-eta-source').textContent = srcMap[s.throughput_source] ?? '';
      document.getElementById('q-throughput').textContent = s.throughput_jobs_per_sec != null
        ? (s.throughput_jobs_per_sec * 60).toFixed(1).replace('.', ',') + ' jobs/min'
        : '—';
    } catch {
      // fail silently — não crítico
    }
  }

  function escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Digest Queue ───────────────────────────────────────────────────────────
  async function loadDigestStats() {
    try {
      const res = await fetch(API + '/api/admin/digest/queue-stats', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const s = await res.json();
      document.getElementById('dq-pending').textContent = (s.pending ?? 0).toLocaleString('pt-BR');
      document.getElementById('dq-running').textContent = (s.running ?? 0).toLocaleString('pt-BR');
      document.getElementById('dq-done').textContent = (s.done ?? 0).toLocaleString('pt-BR');
      document.getElementById('dq-error').textContent = (s.error ?? 0).toLocaleString('pt-BR');
      document.getElementById('dq-skipped').textContent = (s.skipped ?? 0).toLocaleString('pt-BR');
    } catch { /* fail silently */ }
  }

  document.getElementById('digest-enqueue-btn').addEventListener('click', async () => {
    const btn = document.getElementById('digest-enqueue-btn');
    const msg = document.getElementById('digest-enqueue-msg');
    btn.disabled = true;
    msg.textContent = 'Enfileirando...';
    msg.style.color = '#6b7280';
    try {
      const res = await fetch(API + '/api/admin/digest/enqueue', { method: 'POST', headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      if (data.eligible === 0) {
        const pct = data.coverage_min != null ? Math.round(data.coverage_min * 100) + '%' : '80%';
        msg.textContent = 'Nenhum tenant elegível (cobertura mínima: ' + pct + ')';
        msg.style.color = '#d97706';
      } else {
        msg.textContent = data.enqueued + ' job(s) enfileirado(s) para ' + data.eligible + ' tenant(s) (cobertura >= ' + Math.round((data.coverage_min ?? 0.80) * 100) + '%)';
        msg.style.color = '#16a34a';
      }
      loadDigestStats();
    } catch {
      msg.textContent = 'Erro ao enfileirar';
      msg.style.color = '#dc2626';
    } finally {
      btn.disabled = false;
      setTimeout(() => { msg.textContent = ''; }, 5000);
    }
  });

  // ── Forecast Queue ─────────────────────────────────────────────────────────
  async function loadForecastStats() {
    try {
      const res = await fetch(API + '/api/admin/forecast/queue-stats', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const s = await res.json();
      document.getElementById('fq-pending').textContent = (s.pending ?? 0).toLocaleString('pt-BR');
      document.getElementById('fq-running').textContent = (s.running ?? 0).toLocaleString('pt-BR');
      document.getElementById('fq-done').textContent = (s.done ?? 0).toLocaleString('pt-BR');
      document.getElementById('fq-error').textContent = (s.error ?? 0).toLocaleString('pt-BR');
    } catch { /* fail silently */ }
  }

  document.getElementById('forecast-enqueue-btn').addEventListener('click', async () => {
    const btn = document.getElementById('forecast-enqueue-btn');
    const msg = document.getElementById('forecast-enqueue-msg');
    btn.disabled = true;
    msg.textContent = 'Enfileirando...';
    msg.style.color = '#6b7280';
    try {
      const res = await fetch(API + '/api/admin/forecast/enqueue', { method: 'POST', headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      msg.textContent = data.enqueued + ' job(s) enfileirado(s) para ' + data.date;
      msg.style.color = '#16a34a';
      loadForecastStats();
    } catch {
      msg.textContent = 'Erro ao enfileirar';
      msg.style.color = '#dc2626';
    } finally {
      btn.disabled = false;
      setTimeout(() => { msg.textContent = ''; }, 5000);
    }
  });

  // ── ML Training Queue ──────────────────────────────────────────────────────
  async function loadMlStats() {
    try {
      const res = await fetch(API + '/api/admin/ml/queue-stats', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const s = await res.json();
      document.getElementById('mlq-pending').textContent = (s.pending ?? 0).toLocaleString('pt-BR');
      document.getElementById('mlq-running').textContent = (s.running ?? 0).toLocaleString('pt-BR');
      document.getElementById('mlq-done').textContent = (s.done ?? 0).toLocaleString('pt-BR');
      document.getElementById('mlq-error').textContent = (s.error ?? 0).toLocaleString('pt-BR');
    } catch { /* fail silently */ }
  }

  document.getElementById('ml-enqueue-btn').addEventListener('click', async () => {
    const btn = document.getElementById('ml-enqueue-btn');
    const msg = document.getElementById('ml-enqueue-msg');
    btn.disabled = true;
    msg.textContent = 'Enfileirando...';
    msg.style.color = '#6b7280';
    try {
      const res = await fetch(API + '/api/admin/ml/enqueue', { method: 'POST', headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const data = await res.json();
      msg.textContent = data.enqueued + ' job(s) enfileirado(s)';
      msg.style.color = '#16a34a';
      loadMlStats();
    } catch {
      msg.textContent = 'Erro ao enfileirar';
      msg.style.color = '#dc2626';
    } finally {
      btn.disabled = false;
      setTimeout(() => { msg.textContent = ''; }, 5000);
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  if (getToken()) {
    showData();
    loadAll();
  } else {
    showLogin();
  }
</script>
</body>
</html>`;

export function serveAdminPanel(): Response {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
