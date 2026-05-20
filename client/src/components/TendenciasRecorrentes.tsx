import type { RecorrenteAI } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  recorrentes: RecorrenteAI[];
}

export function TendenciasRecorrentes({ recorrentes }: Props) {
  if (recorrentes.length === 0) {
    return (
      <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", margin: 0 }}>
        Dados insuficientes — execute o enriquecimento AI para identificar recorrentes.
      </p>
    );
  }
  return (
    <div style={{ marginTop: "var(--space-sm)" }}>
      {recorrentes.map((r, index) => (
        <div
          key={`${r.merchant_name}-${r.category_group_pt}-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-sm)",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "var(--space-xs)",
            backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)",
          }}
        >
          <div>
            <p style={{ fontWeight: 500, color: "var(--color-text-body)", fontSize: "0.875rem", margin: 0 }}>{r.merchant_name}</p>
            <p style={{ color: "var(--color-muted)", fontSize: "0.75rem", margin: 0 }}>{r.category_group_pt}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)", fontSize: "0.875rem", margin: 0 }}>
              {formatBRL(r.media_valor)}
            </p>
            {r.recurrence_period && (
              <span
                style={{
                  border: "1px solid var(--color-border-hairline)",
                  borderRadius: "var(--radius-pill)",
                  padding: "1px 6px",
                  fontSize: "0.75rem",
                  color: "var(--color-text-body)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface-strong) 60%, transparent)",
                }}
              >
                {r.recurrence_period}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
