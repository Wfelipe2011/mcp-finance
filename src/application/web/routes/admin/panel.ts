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
    <h2>Workers</h2>
    <table id="workers-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>URL</th>
          <th>Status</th>
          <th>Erros</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="workers-body">
        <tr><td colspan="5">Carregando...</td></tr>
      </tbody>
    </table>

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
    showLogin();
  });

  // ── Load all ───────────────────────────────────────────────────────────────
  async function loadAll() {
    await Promise.all([loadTenants(), loadWorkers()]);
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
    tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
      const res = await fetch(API + '/api/admin/workers', { headers: authHeaders() });
      if (res.status === 401) { handleUnauthorized(); return; }
      const workers = await res.json();
      renderWorkers(workers);
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar</td></tr>';
    }
  }

  function renderWorkers(workers) {
    const tbody = document.getElementById('workers-body');
    if (!workers.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum worker cadastrado</td></tr>';
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
        '<td>' + (w.consecutive_errors || 0) + '</td>' +
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
          '<tr><td colspan="5">Nenhum worker cadastrado</td></tr>';
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

  // ── Utility ────────────────────────────────────────────────────────────────
  function escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
