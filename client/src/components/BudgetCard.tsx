import { useState } from "react";
import type { BudgetExecution } from "../api/types.ts";
import type { GastoCategoria } from "../api/types.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { BudgetSettings } from "./BudgetSettings.tsx";

interface BudgetCardProps {
  budgets: BudgetExecution[];
  categorias: GastoCategoria[];
  onRefresh: () => void;
}

export function BudgetCard({ budgets, categorias, onRefresh }: BudgetCardProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm, 12px)" }}>
          <p
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase" as const,
              letterSpacing: 0.9,
              fontWeight: 600,
              color: "var(--color-muted-strong)",
              margin: 0,
            }}
          >
            Execução do Orçamento (mês atual)
          </p>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              fontSize: "0.75rem",
              color: "var(--color-primary, #6366f1)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            Configurar orçamentos
          </button>
        </div>

        {budgets.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>
            Nenhum orçamento configurado.{" "}
            <button
              onClick={() => setShowSettings(true)}
              style={{
                color: "var(--color-primary, #6366f1)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "inherit",
                textDecoration: "underline",
              }}
            >
              Configurar agora
            </button>
          </p>
        ) : (
          budgets.map((b) => (
            <BudgetBar
              key={b.id}
              categoryPt={b.category_pt}
              spentAmount={b.spent_amount}
              monthlyLimit={b.monthly_limit}
              usedRatio={b.used_ratio}
              budgetStatus={b.budget_status}
            />
          ))
        )}
      </div>

      {showSettings && (
        <BudgetSettings
          budgets={budgets}
          categorias={categorias}
          onClose={() => setShowSettings(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
