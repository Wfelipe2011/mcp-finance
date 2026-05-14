import { BarChart } from "@tremor/react";
import type { InvestimentoMensal } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface MonthData {
  mes: string;
  "Aplicações": number;
  "Resgates": number;
}

export function InvestimentosBarChart({ data }: { data: InvestimentoMensal[] }) {
  if (data.length === 0) return null;

  // Group by year+month, summing bruto for application/redemption types
  const grouped = new Map<string, MonthData>();
  for (const row of data) {
    const key = `${row.month_name_pt.slice(0, 3)}/${row.year}`;
    if (!grouped.has(key)) grouped.set(key, { mes: key, "Aplicações": 0, "Resgates": 0 });
    const entry = grouped.get(key)!;
    if (row.movement_type === "APLICACAO" || row.movement_type === "COMPRA") {
      entry["Aplicações"] += row.total_liquido;
    } else {
      entry["Resgates"] += row.total_liquido;
    }
  }

  const chartData = Array.from(grouped.values());

  return (
    <BarChart
      data={chartData}
      index="mes"
      categories={["Aplicações", "Resgates"]}
      colors={["blue", "amber"]}
      valueFormatter={formatBRL}
      className="mt-2 h-48"
      showLegend
    />
  );
}
