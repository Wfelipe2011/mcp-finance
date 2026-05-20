import { useState, useEffect } from "react";
import { adminListWorkers, adminCreateWorker } from "../../api/client.ts";
import type { AdminWorker, CreateWorkerData } from "../../api/client.ts";

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

function isOffline(worker: AdminWorker): boolean {
  if (worker.status === "offline" || !worker.last_seen_at) return true;
  const lastSeenAt = worker.last_seen_at;
  return Date.now() - new Date(lastSeenAt).getTime() > OFFLINE_THRESHOLD_MS;
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "nunca";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  return `${Math.floor(diffH / 24)}d atrás`;
}

export function AdminWorkers() {
  const [workers, setWorkers] = useState<AdminWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateWorkerData>({
    name: "",
    ai_base_url: "",
    ai_model: "",
    ai_api_key: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setWorkers(await adminListWorkers());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const created = await adminCreateWorker({
        name: form.name.trim(),
        ai_base_url: form.ai_base_url.trim(),
        ai_model: form.ai_model.trim(),
        ai_api_key: form.ai_api_key?.trim() || undefined,
      });
      setWorkers((prev) => [...prev, created]);
      setShowModal(false);
      setForm({ name: "", ai_base_url: "", ai_model: "", ai_api_key: "" });
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
          Workers
        </h3>
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => setShowModal(true)}
          >
            + Novo Worker
          </button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => void load()}>
            🔄 Atualizar
          </button>
        </div>
      </div>

      {loading && <div className="loading loading-spinner" />}
      {error && <div className="alert alert-error text-sm">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Modelo</th>
                <th>Status</th>
                <th>Último heartbeat</th>
                <th>Jobs processados</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const offline = isOffline(w);
                const badgeClass = offline
                  ? "badge-error"
                  : w.status === "busy"
                    ? "badge-info"
                    : w.status === "error"
                      ? "badge-warning"
                      : "badge-success";
                return (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{w.ai_model}</td>
                    <td>
                      <span className={`badge badge-sm ${badgeClass}`}>
                        {offline ? `${w.status} / offline` : w.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: offline ? "var(--color-trading-down)" : undefined }}>
                      {formatRelativeTime(w.last_seen_at)}
                    </td>
                    <td>{w.jobs_done}</td>
                  </tr>
                );
              })}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
                    Nenhum worker registrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Novo Worker</h3>
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
                <label className="label"><span className="label-text">AI Base URL</span></label>
                <input
                  type="url"
                  className="input input-bordered input-sm"
                  required
                  value={form.ai_base_url}
                  onChange={(e) => setForm((f) => ({ ...f, ai_base_url: e.target.value }))}
                />
              </div>
              <div className="form-control mb-2">
                <label className="label"><span className="label-text">Modelo</span></label>
                <input
                  className="input input-bordered input-sm"
                  required
                  value={form.ai_model}
                  onChange={(e) => setForm((f) => ({ ...f, ai_model: e.target.value }))}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label"><span className="label-text">AI API Key (opcional)</span></label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={form.ai_api_key ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, ai_api_key: e.target.value }))}
                />
              </div>

              {formError && <div className="alert alert-error text-sm mb-2">{formError}</div>}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowModal(false);
                    setFormError(null);
                  }}
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
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setFormError(null);
              }}
            >
              fechar
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
