import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
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
  color?: string;
  valueFormatter?: (value: number | null) => string;
};

type Margin = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

type BarChartProps = {
  layout?: "horizontal";
  xAxis?: Axis[];
  yAxis?: Axis[];
  series?: Series[];
  height?: number;
  margin?: Margin;
  slotProps?: {
    bar?: {
      rx?: number;
      ry?: number;
    };
  };
};

function toRows(labels: string[], series: Series[]): Array<Record<string, string | number>> {
  return labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex += 1) {
      const item = series[seriesIndex]!;
      const key = item.label ?? `Serie ${seriesIndex + 1}`;
      row[key] = item.data[index] ?? 0;
    }
    return row;
  });
}

export function BarChart({
  layout,
  xAxis = [],
  yAxis = [],
  series = [],
  height = 220,
  margin,
  slotProps,
}: BarChartProps) {
  const labels = layout === "horizontal" ? yAxis[0]?.data ?? [] : xAxis[0]?.data ?? [];
  const normalizedSeries = series.map((item, index) => ({
    ...item,
    label: item.label ?? `Serie ${index + 1}`,
  }));
  const rows = toRows(labels, normalizedSeries);

  const xFormatter = xAxis[0]?.valueFormatter;
  const yFormatter = yAxis[0]?.valueFormatter;
  const xTickStyle = xAxis[0]?.tickLabelStyle;
  const yTickStyle = yAxis[0]?.tickLabelStyle;

  const radius = slotProps?.bar?.rx ?? 4;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={rows}
          layout={layout === "horizontal" ? "vertical" : "horizontal"}
          margin={margin}
          barCategoryGap={layout === "horizontal" ? 8 : 16}
        >
          <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />

          {layout === "horizontal" ? (
            <>
              <XAxis
                type="number"
                tickFormatter={xFormatter}
                tick={{ fill: xTickStyle?.fill ?? "var(--color-muted)", fontSize: xTickStyle?.fontSize ?? 11 }}
                axisLine={{ stroke: "var(--color-border-hairline)" }}
                tickLine={{ stroke: "var(--color-border-hairline)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: yTickStyle?.fill ?? "var(--color-text-body)", fontSize: yTickStyle?.fontSize ?? 11 }}
                width={86}
                axisLine={{ stroke: "var(--color-border-hairline)" }}
                tickLine={{ stroke: "var(--color-border-hairline)" }}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
            formatter={(value: number, name: string) => {
              const currentSeries = normalizedSeries.find((item) => item.label === name);
              if (currentSeries?.valueFormatter) {
                return [currentSeries.valueFormatter(value), name];
              }
              return [value, name];
            }}
          />

          {normalizedSeries.map((item) => (
            <Bar
              key={item.label}
              dataKey={item.label}
              fill={item.color ?? "var(--color-primary)"}
              radius={[radius, radius, radius, radius]}
              maxBarSize={24}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
