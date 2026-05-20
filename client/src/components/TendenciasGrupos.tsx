import type { GrupoTendencia } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  grupos: GrupoTendencia[];
}

function LinearProgress({ value, color = "primary" }: { value: number; color?: string }) {
  const bg = color === "primary" ? "var(--color-primary)" : color;
  return (
    <div style={{ height: 7, borderRadius: "var(--radius-pill)", backgroundColor: "color-mix(in srgb, var(--color-surface-strong) 70%, transparent)" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: "inherit", backgroundColor: bg, transition: "width 0.3s" }} />
    </div>
  );
}

export function TendenciasGrupos({ grupos }: Props) {
  if (grupos.length === 0) {
    return <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", margin: 0 }}>Dados insuficientes.</p>;
  }
  const max = Math.max(...grupos.map((g) => g.media_mensal));
  return (
    <div style={{ marginTop: "var(--space-sm)" }}>
      {grupos.map((g, index) => {
        const previous = grupos[index + 1]?.media_mensal ?? g.media_mensal;
        const isUp = g.media_mensal >= previous;
        const toneColor = isUp ? "var(--color-trading-up)" : "var(--color-trading-down)";
        const trendIcon = isUp ? "↑" : "↓";

        return (
          <div
            key={g.group_pt}
            style={{
              marginBottom: "var(--space-sm)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-sm)",
              backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-xxs)", alignItems: "center" }}>
              <p style={{ color: "var(--color-text-body)", fontSize: "0.875rem", margin: 0 }}>{g.group_pt}</p>
              <p style={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)", fontSize: "0.875rem", margin: 0 }}>
                {formatBRL(g.media_mensal)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-xxs)" }}>
              <span
                data-testid={`tendencia-indicator-${g.group_pt}`}
                data-tone={isUp ? "positive" : "negative"}
                style={{ color: toneColor, fontWeight: 700, lineHeight: 1 }}
              >
                {trendIcon}
              </span>
              <span style={{ color: toneColor, fontWeight: 600, fontSize: "0.75rem" }}>
                {isUp ? "Alta" : "Queda"}
              </span>
            </div>
            <LinearProgress value={(g.media_mensal / max) * 100} />
          </div>
        );
      })}
    </div>
  );
}
