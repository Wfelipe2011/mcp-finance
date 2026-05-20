import { useState, useEffect } from "react";
import { fetchRegras, fetchCategorias, deleteRegra, reorderRegra, aplicarHistorico } from "../api/client.ts";
import type { CategorizationRule, CategoryLabel } from "../api/types.ts";
import { NovaRegraModal } from "./NovaRegraModal.tsx";
import { EditarRegraModal } from "./EditarRegraModal.tsx";

export function RegrasTab() {
  const [regras, setRegras] = useState<CategorizationRule[]>([]);
  const [categorias, setCategorias] = useState<CategoryLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaOpen, setNovaOpen] = useState(false);
  const [editando, setEditando] = useState<CategorizationRule | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRegras(), fetchCategorias()])
      .then(([r, c]) => { setRegras(r); setCategorias(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Excluir esta regra?")) return;
    setActionLoading((s) => ({ ...s, [id]: "delete" }));
    try {
      await deleteRegra(id);
      setRegras((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setActionLoading((s) => { const n = { ...s }; delete n[id]; return n; });
    }
  }

  async function handleReorder(id: number, direction: 'up' | 'down') {
    setActionLoading((s) => ({ ...s, [id]: direction }));
    try {
      const updated = await reorderRegra(id, direction);
      setRegras(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao reordenar");
    } finally {
      setActionLoading((s) => { const n = { ...s }; delete n[id]; return n; });
    }
  }

  async function handleAplicar(id: number) {
    setActionLoading((s) => ({ ...s, [id]: "apply" }));
    try {
      const result = await aplicarHistorico(id);
      showToast(`${result.affected} transações atualizadas.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao aplicar");
    } finally {
      setActionLoading((s) => { const n = { ...s }; delete n[id]; return n; });
    }
  }

  return (
    <div>
      <NovaRegraModal
        open={novaOpen}
        categorias={categorias}
        onClose={() => setNovaOpen(false)}
        onCreated={(r) => setRegras((prev) => [...prev, r])}
      />

      <EditarRegraModal
        open={!!editando}
        regra={editando}
        categorias={categorias}
        onClose={() => setEditando(null)}
        onUpdated={(updated) => {
          setRegras((prev) => prev.map((r) => r.id === updated.id ? updated : r));
          setEditando(null);
        }}
      />

      {toastMsg && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 20000, backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border-hairline)", borderRadius: "var(--radius-lg)",
            padding: "var(--space-xs) var(--space-md)", fontSize: "0.8rem",
            color: "var(--color-text-primary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {toastMsg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-body)", margin: 0 }}>
          Regras de Categorização
        </p>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setNovaOpen(true)}
        >
          + Nova Regra
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
          <span className="loading loading-spinner" />
        </div>
      ) : regras.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", textAlign: "center", padding: "var(--space-md)" }}>
          Nenhuma regra cadastrada. Crie uma regra para categorizar transações automaticamente.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th style={{ color: "var(--color-text-body)", fontSize: "0.7rem" }}>Padrão</th>
                <th style={{ color: "var(--color-text-body)", fontSize: "0.7rem" }}>Categoria</th>
                <th style={{ color: "var(--color-text-body)", fontSize: "0.7rem", textAlign: "center" }}>Usos</th>
                <th style={{ color: "var(--color-text-body)", fontSize: "0.7rem", textAlign: "center" }}>Ativo</th>
                <th style={{ color: "var(--color-text-body)", fontSize: "0.7rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((regra, idx) => {
                const isLoading = !!actionLoading[regra.id];
                return (
                  <tr key={regra.id} style={{ opacity: isLoading ? 0.6 : 1 }}>
                    <td style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", fontFamily: "var(--font-family-mono, monospace)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {regra.pattern}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--color-text-body)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {regra.category_pt ?? regra.category_id_override}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--color-muted)", textAlign: "center" }}>
                      {regra.match_count}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        backgroundColor: regra.is_active ? "var(--color-trading-up)" : "var(--color-muted)",
                      }} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          title="Mover para cima"
                          disabled={isLoading || idx === 0}
                          onClick={() => void handleReorder(regra.id, 'up')}
                        >↑</button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          title="Mover para baixo"
                          disabled={isLoading || idx === regras.length - 1}
                          onClick={() => void handleReorder(regra.id, 'down')}
                        >↓</button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          title="Editar"
                          disabled={isLoading}
                          onClick={() => setEditando(regra)}
                        >✎</button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          title="Aplicar às anteriores"
                          disabled={isLoading}
                          onClick={() => void handleAplicar(regra.id)}
                          style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}
                        >▶ Hist.</button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          title="Excluir"
                          disabled={isLoading}
                          onClick={() => void handleDelete(regra.id)}
                          style={{ color: "var(--color-trading-down)" }}
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
