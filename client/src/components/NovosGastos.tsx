import type { GastoNovo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NovosGastos({ novos }: { novos: GastoNovo[] }) {
  if (novos.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {novos.map((g, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-[var(--radius-lg)] border px-[var(--space-sm)] py-[var(--space-sm)]"
          style={{
            borderColor: "var(--color-border-hairline)",
            backgroundColor: "color-mix(in srgb, var(--color-info) 12%, var(--color-surface-elevated))",
          }}
        >
          <div className="min-w-0">
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.category_pt}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>{g.group_pt} · {g.display_name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p
              data-testid="novo-gasto-valor"
              style={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)", fontSize: "0.875rem", margin: 0 }}
            >
              {formatBRL(g.total_gastos)}
            </p>
            <span
              style={{
                borderRadius: "var(--radius-pill)",
                padding: "1px 6px",
                fontSize: "0.68rem",
                fontWeight: 700,
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              NOVO
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
