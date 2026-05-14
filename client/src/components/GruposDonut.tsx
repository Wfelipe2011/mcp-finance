import { PieChart } from "@mui/x-charts/PieChart";
import type { GastoGrupo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_GROUPS = 5;

export function GruposDonut({ grupos }: { grupos: GastoGrupo[] }) {
  if (grupos.length === 0) return null;

  const sorted = [...grupos].sort((a, b) => b.total_gastos - a.total_gastos);
  let data: { id: number; label: string; value: number }[];

  if (sorted.length <= MAX_GROUPS) {
    data = sorted.map((g, i) => ({ id: i, label: g.group_pt, value: g.total_gastos }));
  } else {
    const top = sorted.slice(0, MAX_GROUPS);
    const outros = sorted.slice(MAX_GROUPS).reduce((sum, g) => sum + g.total_gastos, 0);
    data = [
      ...top.map((g, i) => ({ id: i, label: g.group_pt, value: g.total_gastos })),
      { id: MAX_GROUPS, label: "Outros", value: outros },
    ];
  }

  return (
    <PieChart
      series={[{
        data,
        innerRadius: 50,
        valueFormatter: (item) => formatBRL(item.value),
      }]}
      height={180}
      margin={{ right: 120 }}
    />
  );
}
