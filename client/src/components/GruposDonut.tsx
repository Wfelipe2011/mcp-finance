import { Box, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import type { GastoGrupo } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_GROUPS = 5;
const COLORS = [
  "var(--color-primary)",
  "var(--color-accent-turquoise)",
  "var(--color-trading-up)",
  "var(--color-info)",
  "var(--color-trading-down)",
  "var(--color-primary-active)",
];

export function GruposDonut({ grupos }: { grupos: GastoGrupo[] }) {
  if (grupos.length === 0) return null;

  const sorted = [...grupos].sort((a, b) => b.total_gastos - a.total_gastos);
  let data: { id: number; label: string; value: number; color: string }[];

  if (sorted.length <= MAX_GROUPS) {
    data = sorted.map((g, i) => ({ id: i, label: g.group_pt, value: g.total_gastos, color: COLORS[i % COLORS.length]! }));
  } else {
    const top = sorted.slice(0, MAX_GROUPS);
    const outros = sorted.slice(MAX_GROUPS).reduce((sum, g) => sum + g.total_gastos, 0);
    data = [
      ...top.map((g, i) => ({ id: i, label: g.group_pt, value: g.total_gastos, color: COLORS[i % COLORS.length]! })),
      { id: MAX_GROUPS, label: "Outros", value: outros, color: COLORS[MAX_GROUPS % COLORS.length]! },
    ];
  }

  return (
    <Box>
      <PieChart
        series={[{
          data,
          innerRadius: 50,
          valueFormatter: (item) => formatBRL(item.value),
        }]}
        height={180}
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
