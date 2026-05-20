import type { Transacao } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function AnomaliasList({ transacoes }: { transacoes: Transacao[] }) {
  if (transacoes.length === 0) {
    return (
      <p style={{ marginTop: "var(--space-xs)", color: "var(--color-trading-up)", fontStyle: "italic", fontSize: "0.875rem" }}>
        ✓ Nenhuma anomalia detectada este mês.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {transacoes.map((t) => (
        <li
          key={t.transaction_id}
          className="space-y-2 rounded-[var(--radius-lg)] border px-[var(--space-sm)] py-[var(--space-sm)]"
          style={{
            borderColor: "color-mix(in srgb, var(--color-trading-down) 35%, var(--color-border-hairline))",
            backgroundColor: "color-mix(in srgb, var(--color-trading-down) 10%, var(--color-surface-card))",
          }}
        >
          <div className="flex justify-between items-baseline">
            <p style={{ fontSize: "0.875rem", margin: 0, maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.merchant_name ?? t.description}
            </p>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{formatBRL(Math.abs(t.amount_signed))}</p>
          </div>
          <div style={{ height: 8, borderRadius: "var(--radius-pill)", backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.round((t.anomaly_score ?? 0) * 100)}%`,
                borderRadius: "inherit",
                backgroundColor: "var(--color-trading-down)",
              }}
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>
            score: {t.anomaly_score?.toFixed(2)} · {t.category_pt ?? "sem categoria"} · {t.date_day.slice(0, 10)}
          </p>
        </li>
      ))}
    </ul>
  );
}
