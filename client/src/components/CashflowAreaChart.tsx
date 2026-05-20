import { useState, useEffect } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowProjetado } from "../api/types.ts";
import { amountToTone } from "../utils/semanticTone";

function formatBRLShort(value: number): string {
  if (Math.abs(value) >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${value.toFixed(0)}`;
}

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

export function CashflowAreaChart({ data }: { data: CashflowProjetado[] }) {
  const isMobile = useIsMobile();
  const rows = data.map((row) => ({
    label: row.month_name_pt ?? `${row.year}-${row.month}`,
    real: !row.is_projected ? (row.saldo_liquido ?? undefined) : undefined,
    projetado: row.is_projected ? (row.saldo_liquido ?? undefined) : undefined,
  }));

  const latestReal = [...data].reverse().find((r) => !r.is_projected && r.saldo_liquido !== null)?.saldo_liquido ?? 0;
  const realTone = amountToTone(latestReal);
  const realColor = realTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ left: isMobile ? 48 : 60 }}>
          <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
          />
          <YAxis
            tickFormatter={formatBRLShort}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
          />
          <Area
            type="monotone"
            dataKey="real"
            name="Cashflow Real"
            stroke={realColor}
            fill={`color-mix(in srgb, ${realColor} 20%, transparent)`}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="projetado"
            name="Projetado"
            stroke="var(--color-accent-turquoise)"
            fill="color-mix(in srgb, var(--color-accent-turquoise) 20%, transparent)"
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
