import { Chip, Typography } from "@mui/material";
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
            <Typography variant="body2" noWrap sx={{ color: "var(--color-text-body)" }}>{g.category_pt}</Typography>
            <Typography variant="caption" sx={{ color: "var(--color-muted)" }}>{g.group_pt} · {g.display_name}</Typography>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Typography
              variant="body2"
              data-testid="novo-gasto-valor"
              sx={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)" }}
            >
              {formatBRL(g.total_gastos)}
            </Typography>
            <Chip label="NOVO" size="small" color="primary" />
          </div>
        </li>
      ))}
    </ul>
  );
}
