import { useState, useEffect } from "react";
import { adminListWorkers } from "../../api/client.ts";
import type { AdminWorker } from "../../api/client.ts";

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", margin: 0 }}>
          Workers
        </h3>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => void load()}>
          🔄 Atualizar
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
    </div>
  );
}
