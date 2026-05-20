import { useState } from "react";
import type { Compromisso } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const PREVIEW_COUNT = 5;

export function CompromissosLista({ compromissos, total }: { compromissos: Compromisso[]; total: number }) {
  const [showAll, setShowAll] = useState(false);

  if (compromissos.length === 0) {
    return (
      <p style={{ marginTop: "var(--space-xs)", color: "var(--color-muted)", fontStyle: "italic", fontSize: "0.875rem" }}>
        Sem parcelas em aberto.
      </p>
    );
  }

  const displayed = showAll ? compromissos : compromissos.slice(0, PREVIEW_COUNT);

  return (
    <div className="mt-3 space-y-3">
      <p style={{ color: "var(--color-text-body)", fontSize: "0.875rem", margin: 0 }}>
        Total comprometido:{" "}
        <strong style={{ color: "inherit" }}>{formatBRL(total)}</strong> restante
      </p>
      {displayed.map((c, i) => {
        const progress = Math.round((c.installment_atual / c.total_installments) * 100);
        return (
          <div
            key={i}
            className="space-y-2 rounded-[var(--radius-lg)] border px-[var(--space-sm)] py-[var(--space-sm)]"
            style={{
              borderColor: "var(--color-border-hairline)",
              backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 50%, transparent)",
            }}
          >
            <div className="flex justify-between items-start">
              <p style={{ fontSize: "0.875rem", margin: 0, maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</p>
              <span
                style={{
                  border: "1px solid var(--color-border-hairline)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px var(--space-sm)",
                  fontSize: "0.75rem",
                  lineHeight: 1.3,
                  color: "var(--color-text-body)",
                }}
              >
                {c.installment_atual}/{c.total_installments}
              </span>
            </div>
            <div style={{ height: 7, borderRadius: "var(--radius-pill)", backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: "inherit", backgroundColor: "var(--color-primary)" }} />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>
              {formatBRL(c.compromisso_restante)} restante · {c.dono} · {c.cartao}
            </p>
          </div>
        );
      })}
      {compromissos.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            cursor: "pointer",
            fontSize: "0.875rem",
            padding: 0,
          }}
        >
          {showAll ? "Ver menos ↑" : `Ver mais ${compromissos.length - PREVIEW_COUNT} ↓`}
        </button>
      )}
    </div>
  );
}
