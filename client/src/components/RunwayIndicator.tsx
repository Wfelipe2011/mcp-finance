import { Badge, Text } from "@tremor/react";
import type { Runway } from "../api/types.ts";

function runwayColor(months: number | null): "emerald" | "amber" | "red" {
  if (months === null) return "gray" as "red";
  if (months > 3) return "emerald";
  if (months >= 1) return "amber";
  return "red";
}

export function RunwayIndicator({ runway }: { runway: Runway | null }) {
  if (!runway) return null;
  const color = runwayColor(runway.runway_meses);
  const label = runway.runway_meses !== null
    ? `${runway.runway_meses.toFixed(1)} meses de fôlego`
    : "Fôlego indisponível";

  return (
    <div className="flex items-center gap-2 mt-1">
      <Text className="text-sm text-gray-600">Fôlego financeiro:</Text>
      <Badge color={color}>{label}</Badge>
    </div>
  );
}
