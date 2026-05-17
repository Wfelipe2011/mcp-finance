import { useMediaQuery } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import type { InvestimentoMensal } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

function formatBRLShort(v: number): string {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

interface MonthData {
  mes: string;
  aplicacoes: number;
  resgates: number;
}

export function InvestimentosBarChart({ data }: { data: InvestimentoMensal[] }) {
  const isMobile = useMediaQuery("(max-width:600px)");
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
      yAxis={[{ valueFormatter: formatBRLShort }]}
      series={[
        {
          data: rows.map((r) => r.aplicacoes),
          label: "Aplicações",
          color: "var(--color-trading-up)",
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
        },
        {
          data: rows.map((r) => r.resgates),
          label: "Resgates",
          color: "var(--color-trading-down)",
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
        },
      ]}
      height={220}
      margin={{ left: isMobile ? 52 : 70 }}
    />
  );
}
