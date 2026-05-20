import { useState } from "react";
import type { InsightType } from "../api/types.ts";

const ICON: Record<NonNullable<InsightType>, string> = {
  anomaly: "⚠️",
  digest: "🧠",
  daily: "⭐",
};

const LABEL: Record<NonNullable<InsightType>, string> = {
  anomaly: "Anomalia detectada",
  digest: "Análise do mês",
  daily: "Insight do dia",
};

interface Props {
  type: NonNullable<InsightType>;
  text: string;
  score?: number;
  onVerDetalhes: () => void;
}

function dismissKey(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `insight-dismissed-${today}`;
}

export function CardInsightDia({ type, text, score, onVerDetalhes }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(dismissKey()) === "1";
  });

  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(dismissKey(), "1");
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Insight do dia"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        border: type === "anomaly"
          ? "1px solid color-mix(in srgb, var(--color-trading-down) 45%, var(--color-border-hairline))"
          : "1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border-hairline))",
        backgroundColor: type === "anomaly"
          ? "color-mix(in srgb, var(--color-trading-down) 8%, var(--color-surface-card))"
          : "color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-card))",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-xs)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <span aria-hidden style={{ fontSize: 18 }}>{ICON[type]}</span>
          <p style={{
            margin: 0,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: 0.9,
            fontWeight: 700,
            color: type === "anomaly" ? "var(--color-trading-down)" : "var(--color-primary)",
          }}>
            {LABEL[type]}
            {score != null && ` · ${(score * 100).toFixed(0)}%`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar insight"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "var(--color-muted)",
            padding: "2px 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <p style={{
        margin: 0,
        fontSize: "0.875rem",
        color: "var(--color-text-body)",
        lineHeight: 1.55,
        marginBottom: "var(--space-sm)",
      }}>
        {text}
      </p>

      <button
        type="button"
        onClick={onVerDetalhes}
        style={{
          background: "transparent",
          border: "1px solid var(--color-border-hairline)",
          borderRadius: "var(--radius-md)",
          padding: "4px var(--space-sm)",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          color: "var(--color-text-primary)",
        }}
      >
        Ver detalhes →
      </button>
    </div>
  );
}
