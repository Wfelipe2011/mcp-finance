import { Box, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import type { PatrimonioItem } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const COLORS = [
  "var(--color-surface-elevated)",
  "var(--color-accent-turquoise)",
  "var(--color-primary)",
  "var(--color-trading-up)",
  "var(--color-info)",
];

export function PatrimonioDonut({ contas }: { contas: PatrimonioItem[] }) {
  const grouped = new Map<string, number>();
  for (const c of contas) {
    if (c.tipo === "CREDIT") continue;
    const saldo = c.saldo_atual ?? 0;
    if (saldo <= 0) continue;
    grouped.set(c.tipo, (grouped.get(c.tipo) ?? 0) + saldo);
  }

  const data = Array.from(grouped.entries()).map(([tipo, value], i) => ({
    id: i,
    label: tipo === "BANK" ? "Banco" : tipo === "INVESTMENT" ? "Investimento" : tipo,
    value,
    color: COLORS[i % COLORS.length]!,
  }));

  if (data.length === 0) return null;

  return (
    <Box>
      <PieChart
        series={[{
          data,
          innerRadius: 45,
          valueFormatter: (item) => formatBRL(item.value),
        }]}
        height={160}
        margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        slots={{ legend: () => null }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
        {data.map((item) => (
          <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
