import type { BudgetStatus } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface BudgetBarProps {
  categoryPt: string;
  spentAmount: number;
  monthlyLimit: number;
  usedRatio: number;
  budgetStatus: BudgetStatus;
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
  ok: "var(--color-trading-up, #22c55e)",
  warning: "var(--color-warning, #f59e0b)",
  exceeded: "var(--color-trading-down, #ef4444)",
};

export function BudgetBar({ categoryPt, spentAmount, monthlyLimit, usedRatio, budgetStatus }: BudgetBarProps) {
  const pct = Math.min(usedRatio * 100, 100);
  const color = STATUS_COLORS[budgetStatus];
  const overAmount = spentAmount - monthlyLimit;

  return (
    <div style={{ marginBottom: "var(--space-sm, 12px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{categoryPt}</span>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-muted-strong)", fontFamily: "var(--font-family-numeric)" }}>
          {formatBRL(spentAmount)} / {formatBRL(monthlyLimit)}
        </span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "var(--color-border-hairline, #e5e7eb)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            backgroundColor: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ marginTop: 2, fontSize: "0.75rem", color }}>
        {budgetStatus === "exceeded" && (
          <span>Limite ultrapassado em {formatBRL(overAmount)}</span>
        )}
        {budgetStatus === "warning" && (
          <span>⚠ {pct.toFixed(0)}% do limite atingido</span>
        )}
        {budgetStatus === "ok" && (
          <span style={{ color: "var(--color-muted)" }}>{pct.toFixed(0)}% utilizado</span>
        )}
      </div>
    </div>
  );
}
