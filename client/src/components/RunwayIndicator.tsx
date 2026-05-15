import { Chip, Typography } from "@mui/material";
import type { Runway } from "../api/types.ts";

type ChipColor = "success" | "warning" | "error" | "default";

function formatRunway(meses: number | null): string {
  if (meses === null) return "Fôlego indisponível";
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
  const color = runwayColor(runway.runway_meses);
  const label = formatRunway(runway.runway_meses);

  return (
    <div className="flex items-center gap-2 mt-1">
      <Typography variant="body2" color="text.secondary">Fôlego financeiro:</Typography>
      <Chip label={label} color={color} size="small" />
    </div>
  );
}
