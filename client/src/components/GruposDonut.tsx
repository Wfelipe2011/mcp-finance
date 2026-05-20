import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
    <div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={50}
              outerRadius="88%"
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-border-hairline)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
              formatter={(value: number, name: string) => [formatBRL(value), name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {data.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
