import { useMediaQuery } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import type { GastoCategoria } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_CATEGORIAS = 10;

export function CategoriaBarList({ categorias }: { categorias: GastoCategoria[] }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  if (categorias.length === 0) return null;

  const top = categorias.slice(0, MAX_CATEGORIAS);
  const labels = top.map((c) => c.category_pt);
  const values = top.map((c) => c.total_gastos);

  return (
    <BarChart
      layout="horizontal"
      xAxis={[{ valueFormatter: (v: number) => formatBRL(v) }]}
      yAxis={[{ scaleType: "band", data: labels, tickLabelStyle: { fontSize: 11 } }]}
      series={[{ data: values, valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : "") }]}
      height={top.length * 32 + 40}
      margin={{ left: isMobile ? 80 : 110, right: 16, top: 8, bottom: 24 }}
    />
  );
}
