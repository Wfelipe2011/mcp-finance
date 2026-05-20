import { useState } from "react";

const PREVIEW_LENGTH = 200;

export function DigestNarrative({ narrative }: { narrative: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  const cardStyle = {
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-md)",
    marginTop: "var(--space-sm)",
    border: "1px solid var(--color-border-hairline)",
  };

  if (!narrative) {
    return (
      <div style={{ ...cardStyle, backgroundColor: "var(--color-surface-card)" }}>
        <p style={{ color: "var(--color-muted)", fontStyle: "italic", fontSize: "0.875rem", margin: 0 }}>
          Análise de IA não disponível para este mês.
        </p>
      </div>
    );
  }

  const isLong = narrative.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? narrative : narrative.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <div
      style={{
        ...cardStyle,
        backgroundColor: "color-mix(in srgb, var(--color-accent-turquoise) 10%, var(--color-surface-card))",
      }}
    >
      <p style={{ color: "var(--color-text-body)", lineHeight: 1.65, whiteSpace: "pre-wrap", fontSize: "0.95rem", margin: 0 }}>
        {displayed}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: "var(--space-xs)",
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            cursor: "pointer",
            fontSize: "0.875rem",
            padding: 0,
          }}
        >
          {expanded ? "ver menos ↑" : "ver mais ↓"}
        </button>
      )}
    </div>
  );
}
