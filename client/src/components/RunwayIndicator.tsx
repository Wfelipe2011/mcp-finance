import { Chip, Typography } from "@mui/material";
import type { Runway } from "../api/types.ts";

type ChipColor = "success" | "warning" | "error" | "default";

function runwayColor(months: number | null): ChipColor {
  if (months === null) return "default";
  if (months > 3) return "success";
  if (months >= 1) return "warning";
  return "error";
}

export function RunwayIndicator({ runway }: { runway: Runway | null }) {
  if (!runway) return null;
  const color = runwayColor(runway.runway_meses);
  const label = runway.runway_meses !== null
    ? `${runway.runway_meses.toFixed(1)} meses de fôlego`
    : "Fôlego indisponível";

  return (
    <div className="flex items-center gap-2 mt-1">
      <Typography variant="body2" color="text.secondary">Fôlego financeiro:</Typography>
      <Chip label={label} color={color} size="small" />
    </div>
  );
}
