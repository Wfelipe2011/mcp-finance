import { useState } from "react";
import type { CartaoResumo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function CartaoCard({ cartao }: { cartao: CartaoResumo }) {
  const [open, setOpen] = useState(false);

  const usadoPct =
    cartao.cc_credit_limit && cartao.cc_credit_limit > 0
      ? Math.min(Math.round((cartao.total_comprometido / cartao.cc_credit_limit) * 100), 100)
      : null;

  return (
    <div
      className={`collapse ${open ? "collapse-open" : "collapse-close"}`}
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho clicável */}
      <button
        className="collapse-title"
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-sm) var(--space-md)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "var(--space-sm)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cartao.cartao}
          </p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-muted)" }}>
            {cartao.compromissos.length} compromisso{cartao.compromissos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--color-text-primary)",
            }}
          >
            {formatBRL(cartao.total_comprometido)}
          </p>
          {cartao.cc_credit_limit !== null && (
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted)" }}>
              de {formatBRL(cartao.cc_credit_limit)}
            </p>
          )}
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {/* Barra de comprometimento (apenas quando há limite) */}
      {usadoPct !== null && (
        <div
          style={{
            height: 5,
            backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)",
            margin: "0 var(--space-md)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${usadoPct}%`,
              backgroundColor:
                usadoPct >= 90
                  ? "var(--color-trading-down)"
                  : usadoPct >= 70
                  ? "var(--color-warning, #f59e0b)"
                  : "var(--color-primary)",
              borderRadius: "var(--radius-pill)",
              transition: "width 0.3s",
            }}
          />
        </div>
      )}

      {/* Lista de compromissos (expansível) */}
      {open && (
        <div className="collapse-content" style={{ padding: "var(--space-sm) var(--space-md) var(--space-md)" }}>
          <div className="space-y-2" style={{ marginTop: "var(--space-sm)" }}>
            {cartao.compromissos.map((c, i) => {
              const progressPct = Math.round(
                (c.installment_atual / c.total_installments) * 100
              );
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border-hairline)",
                    padding: "var(--space-xs) var(--space-sm)",
                    backgroundColor:
                      "color-mix(in srgb, var(--color-surface-elevated) 40%, transparent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "var(--space-xs)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--color-text-body)",
                      }}
                    >
                      {c.description || "—"}
                    </p>
                    <span
                      style={{
                        border: "1px solid var(--color-border-hairline)",
                        borderRadius: "var(--radius-pill)",
                        padding: "1px 8px",
                        fontSize: "0.7rem",
                        color: "var(--color-muted)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {c.installment_atual}/{c.total_installments}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: "var(--radius-pill)",
                      backgroundColor:
                        "color-mix(in srgb, var(--color-surface-elevated) 70%, transparent)",
                      margin: "4px 0",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progressPct}%`,
                        borderRadius: "inherit",
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--color-muted)" }}>
                    {formatBRL(c.amount)}/mês · {formatBRL(c.compromisso_restante)} restante · {c.dono}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
