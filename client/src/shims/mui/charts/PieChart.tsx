import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts";

type PieData = {
  id: number;
  label: string;
  value: number;
  color?: string;
};

type PieSeries = {
  data: PieData[];
  innerRadius?: number;
  valueFormatter?: (item: PieData) => string;
};

type PieChartProps = {
  series?: PieSeries[];
  height?: number;
  margin?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  slots?: {
    legend?: () => null;
  };
};

export function PieChart({ series = [], height = 180 }: PieChartProps) {
  const first = series[0];
  if (!first || first.data.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={first.data}
            dataKey="value"
            nameKey="label"
            innerRadius={first.innerRadius ?? 45}
            outerRadius="88%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {first.data.map((entry) => (
              <Cell key={entry.id} fill={entry.color ?? "var(--color-primary)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
            formatter={(value: number, _name, item) => {
              const payload = item.payload as PieData;
              if (first.valueFormatter) {
                return [first.valueFormatter(payload), payload.label];
              }
              return [value, payload.label];
            }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}
