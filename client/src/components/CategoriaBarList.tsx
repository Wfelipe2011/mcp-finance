import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GastoCategoria } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const MAX_CATEGORIAS = 10;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 600);
  useEffect(() => {
    const mql = window.matchMedia("(max-width:600px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function CategoriaBarList({ categorias }: { categorias: GastoCategoria[] }) {
  const isMobile = useIsMobile();

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
  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);
  const displayLabels = isMobile ? top.map((c) => truncate(c.category_pt, 12)) : top.map((c) => c.category_pt);

  const rows = top.map((c, i) => ({ label: displayLabels[i]!, value: c.total_gastos }));

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
      <div style={{ width: "100%", height: top.length * 32 + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: isMobile ? 80 : 110, right: 16, top: 8, bottom: 24 }}
            barCategoryGap={8}
          >
            <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatBRL(v)}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--color-border-hairline)" }}
              tickLine={{ stroke: "var(--color-border-hairline)" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: "var(--color-text-body)", fontSize: 11 }}
              width={isMobile ? 80 : 110}
              axisLine={{ stroke: "var(--color-border-hairline)" }}
              tickLine={{ stroke: "var(--color-border-hairline)" }}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)" }}
              contentStyle={{
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-border-hairline)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
              formatter={(v: number) => [formatBRL(v), "Total"]}
            />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
