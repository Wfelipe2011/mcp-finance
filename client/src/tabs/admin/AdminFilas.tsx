import { useState, useEffect } from "react";
import {
  adminQueueStats,
  adminEnqueueDigest,
  adminEnqueueEnrich,
  adminListTenants,
} from "../../api/client.ts";
import type { AdminQueueStatsByType, AdminTenant } from "../../api/client.ts";

const QUEUE_ROWS: { key: keyof AdminQueueStatsByType; label: string }[] = [
  { key: "enrich", label: "Enrich" },
  { key: "digest", label: "Digest" },
  { key: "forecast", label: "Forecast" },
  { key: "dailyInsight", label: "Daily Insight" },
];

export function AdminFilas() {
  const [stats, setStats] = useState<AdminQueueStatsByType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [enqueueLoading, setEnqueueLoading] = useState<"digest" | "enrich" | null>(null);
  const [enqueueMsg, setEnqueueMsg] = useState<string | null>(null);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      setStats(await adminQueueStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
    adminListTenants()
      .then(setTenants)
      .catch(() => {/* ignora */});
  }, []);

  async function handleEnqueue(type: "digest" | "enrich") {
    setEnqueueLoading(type);
    setEnqueueMsg(null);
    try {
      if (type === "digest") {
        await adminEnqueueDigest(selectedTenant || undefined);
      } else {
        await adminEnqueueEnrich(selectedTenant || undefined);
      }
      setEnqueueMsg(`Job de ${type} enfileirado com sucesso.`);
      await loadStats();
    } catch (err) {
      setEnqueueMsg(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEnqueueLoading(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", margin: 0 }}>
          Filas
        </h3>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => void loadStats()}>
          🔄 Atualizar
        </button>
      </div>

      {loading && <div className="loading loading-spinner" />}
      {error && <div className="alert alert-error text-sm">{error}</div>}

      {!loading && stats && (
        <div className="overflow-x-auto mb-6">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Fila</th>
                <th>Total</th>
                <th>Pendentes</th>
                <th>Em execução</th>
                <th>Concluídos</th>
                <th>Erros</th>
              </tr>
            </thead>
            <tbody>
              {QUEUE_ROWS.map(({ key, label }) => {
                const row = stats[key];
                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{row.total}</td>
                    <td className="text-warning">{row.pending}</td>
                    <td className="text-info">{row.running}</td>
                    <td className="text-success">{row.done}</td>
                    <td className="text-error">{row.error}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          background: "var(--color-surface-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          padding: "var(--space-md)",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "var(--space-sm)", fontSize: "0.9rem" }}>
          Enfileirar Job
        </p>
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="select select-sm select-bordered"
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
          >
            <option value="">Todos os tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={enqueueLoading === "digest"}
            onClick={() => void handleEnqueue("digest")}
          >
            {enqueueLoading === "digest"
              ? <span className="loading loading-spinner loading-xs" />
              : "Enfileirar Digest"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={enqueueLoading === "enrich"}
            onClick={() => void handleEnqueue("enrich")}
          >
            {enqueueLoading === "enrich"
              ? <span className="loading loading-spinner loading-xs" />
              : "Enfileirar Enrich"}
          </button>
        </div>
        {enqueueMsg && (
          <p style={{ marginTop: "var(--space-sm)", fontSize: "0.85rem", color: enqueueMsg.startsWith("Erro") ? "var(--color-trading-down)" : "var(--color-trading-up)" }}>
            {enqueueMsg}
          </p>
        )}
      </div>
    </div>
  );
}
