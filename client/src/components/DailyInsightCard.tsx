import type { DailyInsight } from "../api/types.ts";

interface DailyInsightCardProps {
  insight: DailyInsight;
}

export function DailyInsightCard({ insight }: DailyInsightCardProps) {
  const prob = insight.probability ?? 0;
  const probPct = Math.round(prob * 100);

  return (
    <div
      style={{
        marginBottom: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
      }}
    >
      {insight.category_pt && (
        <span
          style={{
            display: "inline-block",
            marginBottom: "var(--space-xs)",
            borderRadius: "var(--radius-pill)",
            padding: "1px 8px",
            fontSize: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, var(--color-surface-card))",
            color: "var(--color-primary)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
          }}
        >
          {insight.category_pt}
        </span>
      )}

      <p style={{ marginBottom: "var(--space-xs)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
        {insight.message_pt}
      </p>

      {insight.probability !== null && (
        <div style={{ marginBottom: "var(--space-xs)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0, marginBottom: 4 }}>
            Probabilidade de gasto hoje: {probPct}%
          </p>
          <div style={{ height: 6, borderRadius: "var(--radius-pill)", backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)" }}>
            <div style={{ height: "100%", width: `${probPct}%`, borderRadius: "inherit", backgroundColor: "var(--color-primary)" }} />
          </div>
        </div>
      )}

      {insight.estimated_amount !== null && (
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>
          Estimativa: R$ {insight.estimated_amount.toFixed(2)}
          {insight.lower_bound !== null && insight.upper_bound !== null && (
            <span> (R$ {insight.lower_bound.toFixed(2)} – R$ {insight.upper_bound.toFixed(2)})</span>
          )}
        </p>
      )}

      {insight.secondary_insights.length > 0 && (
        <div style={{ marginTop: "var(--space-xs)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-xxs)" }}>
            Outras categorias prováveis hoje:
          </p>
          {insight.secondary_insights.map((si) => (
            <div key={si.category_pt} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <p style={{ fontSize: "0.75rem", margin: 0 }}>{si.category_pt}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>
                {Math.round(si.probability * 100)}% · R$ {si.estimated_amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
