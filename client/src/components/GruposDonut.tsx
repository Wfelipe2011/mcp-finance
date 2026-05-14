import { DonutChart, Legend } from "@tremor/react";
import type { GastoGrupo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_GROUPS = 5;

export function GruposDonut({ grupos }: { grupos: GastoGrupo[] }) {
  if (grupos.length === 0) return null;

  const sorted = [...grupos].sort((a, b) => b.total_gastos - a.total_gastos);
  let data: { name: string; value: number }[];

  if (sorted.length <= MAX_GROUPS) {
    data = sorted.map((g) => ({ name: g.group_pt, value: g.total_gastos }));
  } else {
    const top = sorted.slice(0, MAX_GROUPS);
    const outros = sorted.slice(MAX_GROUPS).reduce((sum, g) => sum + g.total_gastos, 0);
    data = [...top.map((g) => ({ name: g.group_pt, value: g.total_gastos })), { name: "Outros", value: outros }];
  }

  return (
    <div>
      <DonutChart
        data={data}
        category="value"
        index="name"
        valueFormatter={formatBRL}
        className="mt-2 h-40"
      />
      <Legend categories={data.map((d) => d.name)} className="mt-2 text-xs" />
    </div>
  );
}
