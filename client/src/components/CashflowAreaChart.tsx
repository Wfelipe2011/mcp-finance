import { useMediaQuery } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import type { CashflowProjetado } from "../api/types.ts";
import { amountToTone } from "../utils/semanticTone";

function formatBRLShort(value: number): string {
  if (Math.abs(value) >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${value.toFixed(0)}`;
}

export function CashflowAreaChart({ data }: { data: CashflowProjetado[] }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const xLabels = data.map((row) => row.month_name_pt ?? `${row.year}-${row.month}`);
  const real = data.map((row) => (!row.is_projected ? (row.saldo_liquido ?? null) : null));
  const projetado = data.map((row) => (row.is_projected ? (row.saldo_liquido ?? null) : null));
  const latestReal = [...real].reverse().find((value): value is number => value !== null) ?? 0;
  const realTone = amountToTone(latestReal);
  const realColor = realTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";

  return (
    <LineChart
      xAxis={[{ scaleType: "point", data: xLabels }]}
      yAxis={[{ valueFormatter: formatBRLShort }]}
      series={[
        {
          data: real,
          label: "Cashflow Real",
          area: true,
          connectNulls: false,
          color: realColor,
        },
        {
          data: projetado,
          label: "Projetado",
          area: true,
          connectNulls: false,
          color: "var(--color-accent-turquoise)",
        },
      ]}
      height={220}
      margin={{ left: isMobile ? 48 : 60 }}
    />
  );
}
