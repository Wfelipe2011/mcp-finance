import { useState, useEffect } from "react";
import {
  adminListTenants,
  adminToggleTenantStatus,
  adminCreateTenant,
} from "../../api/client.ts";
import type { AdminTenant, CreateTenantData } from "../../api/client.ts";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR");
}

export function AdminTenants() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateTenantData>({
    name: "",
    email: "",
    password: "",
    pluggy_email: "",
    pluggy_password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setTenants(await adminListTenants());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleToggle(tenant: AdminTenant) {
    const nextStatus = tenant.status === "active" ? "inactive" : "active";
    setActionLoading(tenant.id);
    try {
      const updated = await adminToggleTenantStatus(tenant.id, nextStatus);
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const created = await adminCreateTenant({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        pluggy_email: form.pluggy_email?.trim() || undefined,
        pluggy_password: form.pluggy_password?.trim() || undefined,
      });
      setTenants((prev) => [...prev, created]);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", pluggy_email: "", pluggy_password: "" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", margin: 0 }}>
          Tenants
        </h3>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowModal(true)}
        >
          + Novo Tenant
        </button>
      </div>

      {loading && <div className="loading loading-spinner" />}
      {error && <div className="alert alert-error text-sm">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Último login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td style={{ fontSize: "0.8rem" }}>{t.email}</td>
                  <td>
                    <span className={`badge badge-sm ${t.status === "active" ? "badge-success" : "badge-ghost"}`}>
                      {t.status === "active" ? "Ativo" : "Suspenso"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(t.created_at)}</td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(t.last_login_at)}</td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-xs ${t.status === "active" ? "btn-warning" : "btn-success"}`}
                      disabled={actionLoading === t.id}
                      onClick={() => void handleToggle(t)}
                    >
                      {actionLoading === t.id
                        ? <span className="loading loading-spinner loading-xs" />
                        : t.status === "active" ? "Suspender" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
                    Nenhum tenant encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Tenant */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Novo Tenant</h3>
            <form onSubmit={(e) => void handleCreate(e)}>
              <div className="form-control mb-2">
                <label className="label"><span className="label-text">Nome</span></label>
                <input
                  className="input input-bordered input-sm"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-control mb-2">
                <label className="label"><span className="label-text">Email</span></label>
                <input
                  type="email"
                  className="input input-bordered input-sm"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-control mb-2">
                <label className="label"><span className="label-text">Senha</span></label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="form-control mb-2">
                <label className="label"><span className="label-text">Email Pluggy</span></label>
                <input
                  type="email"
                  className="input input-bordered input-sm"
                  value={form.pluggy_email}
                  onChange={(e) => setForm((f) => ({ ...f, pluggy_email: e.target.value }))}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label"><span className="label-text">Senha Pluggy</span></label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={form.pluggy_password}
                  onChange={(e) => setForm((f) => ({ ...f, pluggy_password: e.target.value }))}
                />
              </div>
              {formError && <div className="alert alert-error text-sm mb-2">{formError}</div>}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setShowModal(false); setFormError(null); }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={formLoading}>
                  {formLoading ? <span className="loading loading-spinner loading-xs" /> : "Criar"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => { setShowModal(false); setFormError(null); }}>fechar</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
