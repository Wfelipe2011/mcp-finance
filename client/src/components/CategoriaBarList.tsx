import { useMediaQuery } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import type { GastoCategoria } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_CATEGORIAS = 10;

export function CategoriaBarList({ categorias }: { categorias: GastoCategoria[] }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  if (categorias.length === 0) {
    return (
      <p
        data-testid="categoria-empty"
        style={{
          marginTop: "var(--space-sm)",
          color: "var(--color-muted)",
          fontSize: "0.875rem",
          fontStyle: "italic",
        }}
      >
        Sem categorias no período.
      </p>
    );
  }

  const top = categorias.slice(0, MAX_CATEGORIAS);
  const labels = top.map((c) => c.category_pt);
  const values = top.map((c) => c.total_gastos);

  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + "…" : s;
  const displayLabels = isMobile ? labels.map((l) => truncate(l, 12)) : labels;

  return (
    <div
      data-testid="categoria-chart-wrapper"
      style={{
        marginTop: "var(--space-sm)",
        border: "1px solid var(--color-border-hairline)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-sm)",
        backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)",
      }}
    >
      <BarChart
        layout="horizontal"
        xAxis={[
          {
            valueFormatter: (v: number) => formatBRL(v),
            tickLabelStyle: { fill: "var(--color-muted)", fontSize: 11 },
          },
        ]}
        yAxis={[
          {
            scaleType: "band",
            data: displayLabels,
            tickLabelStyle: { fill: "var(--color-text-body)", fontSize: 11 },
          },
        ]}
        series={[
          {
            data: values,
            color: "var(--color-primary)",
            valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
          },
        ]}
        height={top.length * 32 + 40}
        margin={{ left: isMobile ? 80 : 110, right: 16, top: 8, bottom: 24 }}
        slotProps={{
          bar: {
            rx: 4,
            ry: 4,
          },
        }}
      />
    </div>
  );
}
