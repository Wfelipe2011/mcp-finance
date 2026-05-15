import { Chip, Typography } from "@mui/material";
import type { Runway } from "../api/types.ts";

type ChipColor = "success" | "warning" | "error" | "default";

function formatRunway(meses: number | null): string {
  if (meses === null) return "Indisponível";
  const diasTotais = Math.round(meses * 30.44);
  if (diasTotais < 30) return `${diasTotais} dias`;
  const mesesInteiros = Math.floor(diasTotais / 30);
  const diasRestantes = diasTotais % 30;
  if (diasRestantes === 0) return `${mesesInteiros} meses`;
  return `${mesesInteiros} meses e ${diasRestantes} dias`;
}

function runwayColor(meses: number | null): ChipColor {
  if (meses === null) return "default";
  const diasTotais = Math.round(meses * 30.44);
  if (diasTotais >= 90) return "success";
  if (diasTotais >= 30) return "warning";
  return "error";
}

export function RunwayIndicator({ runway }: { runway: Runway | null }) {
  if (!runway) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-2">
        <Typography variant="body2" color="text.secondary">Fôlego imediato:</Typography>
        <Chip
          label={formatRunway(runway.runway_imediato_meses)}
          color={runwayColor(runway.runway_imediato_meses)}
          size="small"
        />
      </div>
      <div className="flex items-center gap-2">
        <Typography variant="body2" color="text.secondary">Fôlego total:</Typography>
        <Chip
          label={formatRunway(runway.runway_total_meses)}
          color={runwayColor(runway.runway_total_meses)}
          size="small"
        />
      </div>
    </div>
  );
}
