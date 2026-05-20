import type { NotableExpense } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NotableExpenses({ expenses }: { expenses: NotableExpense[] | null | undefined }) {
  if (!Array.isArray(expenses) || expenses.length === 0) return null;

  const highestAmount = Math.max(...expenses.map((item) => Math.abs(item.amount)), 1);

  return (
    <ul className="mt-3 space-y-2">
      {expenses.map((e, i) => (
        <li
          key={i}
          className="rounded-[var(--radius-lg)] border pl-3 pr-[var(--space-sm)] py-[var(--space-xs)]"
          style={{
            borderColor: "color-mix(in srgb, var(--color-primary) 45%, var(--color-border-hairline))",
            backgroundColor: "color-mix(in srgb, var(--color-primary) 9%, var(--color-surface-card))",
          }}
        >
          <div
            aria-hidden
            style={{
              width: `${Math.max(12, Math.round((Math.abs(e.amount) / highestAmount) * 100))}%`,
              maxWidth: "100%",
              height: "3px",
              marginBottom: "var(--space-xs)",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-primary)",
            }}
          />
          <div className="flex justify-between items-baseline">
            <p style={{ fontWeight: 500, fontSize: "0.875rem", margin: 0, maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</p>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>{formatBRL(e.amount)}</p>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>{e.reason}</p>
        </li>
      ))}
    </ul>
  );
}
