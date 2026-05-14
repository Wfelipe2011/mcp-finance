import { AreaChart } from "@tremor/react";
import type { CashflowProjetado } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface ChartRow {
  mes: string;
  "Cashflow Real": number | null;
  "Projetado": number | null;
}

export function CashflowAreaChart({ data }: { data: CashflowProjetado[] }) {
  const chartData: ChartRow[] = data.map((row) => ({
    mes: row.month_name_pt ?? `${row.year}-${row.month}`,
    "Cashflow Real": row.is_projected ? null : (row.saldo_liquido ?? null),
    "Projetado":     row.is_projected ? (row.saldo_liquido ?? null) : null,
  }));

  return (
    <AreaChart
      data={chartData}
      index="mes"
      categories={["Cashflow Real", "Projetado"]}
      colors={["blue", "violet"]}
      valueFormatter={formatBRL}
      connectNulls
      className="mt-2 h-48"
      showLegend
    />
  );
}
