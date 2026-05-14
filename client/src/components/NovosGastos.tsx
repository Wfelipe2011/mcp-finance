import { Chip, Typography } from "@mui/material";
import type { GastoNovo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

export function NovosGastos({ novos }: { novos: GastoNovo[] }) {
  if (novos.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {novos.map((g, i) => (
        <li key={i} className="flex items-center justify-between">
          <div className="min-w-0">
            <Typography variant="body2" noWrap>{g.category_pt}</Typography>
            <Typography variant="caption" color="text.secondary">{g.group_pt} · {g.display_name}</Typography>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Typography variant="body2" fontWeight={500}>{formatBRL(g.total_gastos)}</Typography>
            <Chip label="NOVO" size="small" color="primary" />
          </div>
        </li>
      ))}
    </ul>
  );
}
