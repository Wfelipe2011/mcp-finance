import { Typography } from "@mui/material";
import type { Runway } from "../api/types.ts";
import { runwayDaysToTone, type SemanticTone } from "../utils/semanticTone.ts";

function formatRunway(meses: number | null): string {
  if (meses === null) return "Indisponível";
  const diasTotais = Math.round(meses * 30.44);
  if (diasTotais < 30) return `${diasTotais} dias`;
  const mesesInteiros = Math.floor(diasTotais / 30);
  const diasRestantes = diasTotais % 30;
  if (diasRestantes === 0) return `${mesesInteiros} meses`;
  return `${mesesInteiros} meses e ${diasRestantes} dias`;
}

function monthsToDays(meses: number | null): number | null {
  if (meses === null) return null;
  return Math.round(meses * 30.44);
}

function toneToStyles(tone: SemanticTone): { color: string; backgroundColor: string; borderColor: string } {
  if (tone === "positive") {
    return {
      color: "var(--color-trading-up)",
      backgroundColor: "color-mix(in srgb, var(--color-trading-up) 18%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-trading-up) 40%, var(--color-border-hairline))",
    };
  }
  if (tone === "warning") {
    return {
      color: "var(--color-primary)",
      backgroundColor: "color-mix(in srgb, var(--color-primary) 16%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-primary) 40%, var(--color-border-hairline))",
    };
  }
  if (tone === "negative") {
    return {
      color: "var(--color-trading-down)",
      backgroundColor: "color-mix(in srgb, var(--color-trading-down) 16%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-trading-down) 40%, var(--color-border-hairline))",
    };
  }
  return {
    color: "var(--color-text-body)",
    backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 65%, transparent)",
    borderColor: "var(--color-border-hairline)",
  };
}

export function RunwayIndicator({ runway }: { runway: Runway | null }) {
  if (!runway) return null;

  const imediatoDays = monthsToDays(runway.runway_imediato_meses);
  const totalDays = monthsToDays(runway.runway_total_meses);
  const imediatoTone = runwayDaysToTone(imediatoDays ?? Number.NaN);
  const totalTone = runwayDaysToTone(totalDays ?? Number.NaN);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Typography variant="body2" sx={{ color: "var(--color-text-body)" }}>Fôlego imediato</Typography>
        <span
          data-testid="runway-imediato-badge"
          data-tone={imediatoTone}
          style={{
            ...toneToStyles(imediatoTone),
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "var(--radius-pill)",
            padding: "2px var(--space-sm)",
            fontSize: "0.75rem",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {formatRunway(runway.runway_imediato_meses)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Typography variant="body2" sx={{ color: "var(--color-text-body)" }}>Fôlego total</Typography>
        <span
          data-testid="runway-total-badge"
          data-tone={totalTone}
          style={{
            ...toneToStyles(totalTone),
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "var(--radius-pill)",
            padding: "2px var(--space-sm)",
            fontSize: "0.75rem",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {formatRunway(runway.runway_total_meses)}
        </span>
      </div>
    </div>
  );
}
