import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InvestimentoMensal } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

function formatBRLShort(v: number): string {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
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

interface MonthData {
  mes: string;
  aplicacoes: number;
  resgates: number;
}

export function InvestimentosBarChart({ data }: { data: InvestimentoMensal[] }) {
  const isMobile = useIsMobile();
  if (data.length === 0) return null;

  const grouped = new Map<string, MonthData>();
  for (const row of data) {
    const key = `${row.month_name_pt.slice(0, 3)}/${row.year}`;
    if (!grouped.has(key)) grouped.set(key, { mes: key, aplicacoes: 0, resgates: 0 });
    const entry = grouped.get(key)!;
    if (row.movement_type === "APLICACAO" || row.movement_type === "COMPRA") {
      entry.aplicacoes += row.total_liquido;
    } else {
      entry.resgates += row.total_liquido;
    }
  }

  const rows = Array.from(grouped.values());

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: isMobile ? 52 : 70 }}>
          <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="mes"
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
            formatter={(v: number, name: string) => [formatBRL(v), name]}
          />
          <Bar dataKey="aplicacoes" name="Aplicações" fill="var(--color-trading-up)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="resgates" name="Resgates" fill="var(--color-trading-down)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
