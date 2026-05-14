import { BarChart } from "@mui/x-charts/BarChart";
import type { InvestimentoMensal } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface MonthData {
  mes: string;
  aplicacoes: number;
  resgates: number;
}

export function InvestimentosBarChart({ data }: { data: InvestimentoMensal[] }) {
  if (data.length === 0) return null;

  const grouped = new Map<string, MonthData>();
  for (const row of data) {
    const key = `${row.month_name_pt.slice(0, 3)}/${row.year}`;
    if (!grouped.has(key)) grouped.set(key, { mes: key, aplicacoes: 0, resgates: 0 });
    const entry = grouped.get(key)!;
    if (row.movement_type === "APLICACAO" || row.movement_type === "COMPRA") {
      entry.aplicacoes += row.total_liquido;
    } else {
      entry.resgates += row.total_liquido;
    }
  }

  const rows = Array.from(grouped.values());
  const labels = rows.map((r) => r.mes);

  return (
    <BarChart
      xAxis={[{ scaleType: "band", data: labels }]}
      yAxis={[{ valueFormatter: (v: number) => formatBRL(v) }]}
      series={[
        {
          data: rows.map((r) => r.aplicacoes),
          label: "Aplicações",
          color: "#1976d2",
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
        },
        {
          data: rows.map((r) => r.resgates),
          label: "Resgates",
          color: "#f59e0b",
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
        },
      ]}
      height={220}
      margin={{ left: 70 }}
    />
  );
}
