import { useState } from "react";
import type { BudgetExecution, GastoCategoria } from "../api/types.ts";
import { upsertBudget, deleteBudget } from "../api/client.ts";
import { formatBRL } from "../utils/format.ts";

interface BudgetSettingsProps {
  budgets: BudgetExecution[];
  categorias: GastoCategoria[];
  onClose: () => void;
  onRefresh: () => void;
}

export function BudgetSettings({ budgets, categorias, onClose, onRefresh }: BudgetSettingsProps) {
  const budgetMap = new Map(budgets.map((b) => [b.category_pt, b]));

  const allCategories = Array.from(
    new Set([...categorias.map((c) => c.category_pt), ...budgets.map((b) => b.category_pt)])
  ).sort();

  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const cat of allCategories) {
      const existing = budgetMap.get(cat);
      if (existing) init[cat] = String(existing.monthly_limit);
    }
    return init;
  });

  const [saving, setSaving] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(categoryPt: string) {
    const val = parseFloat(limits[categoryPt] ?? "");
    if (isNaN(val) || val <= 0) {
      setError(`Valor inválido para "${categoryPt}". Informe um número maior que zero.`);
      return;
    }
    setSaving(categoryPt);
    setError(null);
    try {
      await upsertBudget({ category_pt: categoryPt, monthly_limit: val });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(id: number, categoryPt: string) {
    setRemoving(id);
    setError(null);
    try {
      await deleteBudget(id);
      setLimits((prev) => {
        const next = { ...prev };
        delete next[categoryPt];
        return next;
      });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface-card, #fff)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "var(--space-md, 16px)",
          width: "min(480px, 95vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md, 16px)" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Configurar Orçamentos</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "var(--color-muted)" }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--color-trading-down, #ef4444)", fontSize: "0.875rem", marginBottom: "var(--space-sm)" }}>
            {error}
          </div>
        )}

        {allCategories.length === 0 && (
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
            Nenhuma categoria com gastos no período selecionado.
          </p>
        )}

        {allCategories.map((cat) => {
          const existing = budgetMap.get(cat);
          const currentLimit = limits[cat] ?? "";
          const isSavingThis = saving === cat;
          const isRemovingThis = existing ? removing === existing.id : false;

          return (
            <div
              key={cat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                padding: "8px 0",
                borderBottom: "1px solid var(--color-border-hairline, #e5e7eb)",
              }}
            >
              <span style={{ flex: 1, fontSize: "0.875rem" }}>
                {cat}
                {existing && (
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", display: "block" }}>
                    Gasto: {formatBRL(existing.spent_amount)}
                  </span>
                )}
              </span>

              <input
                type="number"
                min="1"
                step="50"
                placeholder="Limite R$"
                value={currentLimit}
                onChange={(e) => setLimits((prev) => ({ ...prev, [cat]: e.target.value }))}
                style={{
                  width: 100,
                  padding: "4px 8px",
                  border: "1px solid var(--color-border-hairline, #d1d5db)",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                  backgroundColor: "var(--color-surface-input, #f9fafb)",
                }}
              />

              <button
                onClick={() => handleSave(cat)}
                disabled={isSavingThis || !currentLimit}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.8125rem",
                  backgroundColor: "var(--color-primary, #6366f1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: isSavingThis ? "wait" : "pointer",
                  opacity: isSavingThis || !currentLimit ? 0.6 : 1,
                }}
              >
                {isSavingThis ? "..." : "Salvar"}
              </button>

              {existing && (
                <button
                  onClick={() => handleRemove(existing.id, cat)}
                  disabled={isRemovingThis}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.8125rem",
                    backgroundColor: "transparent",
                    color: "var(--color-trading-down, #ef4444)",
                    border: "1px solid var(--color-trading-down, #ef4444)",
                    borderRadius: 6,
                    cursor: isRemovingThis ? "wait" : "pointer",
                    opacity: isRemovingThis ? 0.6 : 1,
                  }}
                >
                  {isRemovingThis ? "..." : "Remover"}
                </button>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: "var(--space-md)", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              fontSize: "0.875rem",
              backgroundColor: "var(--color-surface-card)",
              border: "1px solid var(--color-border-hairline, #d1d5db)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
