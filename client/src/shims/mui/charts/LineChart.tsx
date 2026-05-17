import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Axis = {
  data?: string[];
  valueFormatter?: (value: number) => string;
  scaleType?: "band" | "point" | "linear";
  tickLabelStyle?: {
    fill?: string;
    fontSize?: number;
  };
};

type Series = {
  data: Array<number | null>;
  label?: string;
  area?: boolean;
  connectNulls?: boolean;
  color?: string;
};

type Margin = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

type LineChartProps = {
  xAxis?: Axis[];
  yAxis?: Axis[];
  series?: Series[];
  height?: number;
  margin?: Margin;
};

function toRows(labels: string[], series: Series[]): Array<Record<string, string | number>> {
  return labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex += 1) {
      const item = series[seriesIndex]!;
      const value = item.data[index];
      const key = item.label ?? `Serie ${seriesIndex + 1}`;
      row[key] = value ?? Number.NaN;
    }
    return row;
  });
}

export function LineChart({ xAxis = [], yAxis = [], series = [], height = 220, margin }: LineChartProps) {
  const labels = xAxis[0]?.data ?? [];
  const normalizedSeries = series.map((item, index) => ({
    ...item,
    label: item.label ?? `Serie ${index + 1}`,
  }));
  const rows = toRows(labels, normalizedSeries);
  const yFormatter = yAxis[0]?.valueFormatter;
  const xTickStyle = xAxis[0]?.tickLabelStyle;
  const yTickStyle = yAxis[0]?.tickLabelStyle;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={margin}>
          <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: xTickStyle?.fill ?? "var(--color-muted)", fontSize: xTickStyle?.fontSize ?? 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
          />
          <YAxis
            tickFormatter={yFormatter}
            tick={{ fill: yTickStyle?.fill ?? "var(--color-muted)", fontSize: yTickStyle?.fontSize ?? 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
            formatter={(value: number, name: string) => {
              if (Number.isNaN(value)) return ["-", name];
              return [yFormatter ? yFormatter(value) : value, name];
            }}
          />

          {normalizedSeries.map((item) => {
            const stroke = item.color ?? "var(--color-primary)";
            return (
              <Line
                key={item.label}
                type="monotone"
                dataKey={item.label}
                stroke={stroke}
                strokeWidth={2.2}
                dot={false}
                connectNulls={Boolean(item.connectNulls)}
                isAnimationActive={false}
              />
            );
          })}

          {normalizedSeries
            .filter((item) => item.area)
            .map((item) => (
              <Area
                key={`${item.label}-area`}
                type="monotone"
                dataKey={item.label}
                fill={item.color ?? "var(--color-primary)"}
                fillOpacity={0.14}
                stroke="none"
                isAnimationActive={false}
                connectNulls={Boolean(item.connectNulls)}
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
