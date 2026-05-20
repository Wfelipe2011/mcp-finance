import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
    <div>
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={45}
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
