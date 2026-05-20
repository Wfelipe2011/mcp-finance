import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ParcelaTimeline } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const PALETTE = [
  "var(--color-primary)",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

function formatBRLShort(v: number): string {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

function formatMesRef(isoDate: string): string {
  const d = new Date(isoDate);
  const mes = d.toLocaleString("pt-BR", { month: "short", timeZone: "UTC" });
  const ano = String(d.getUTCFullYear()).slice(2);
  return `${mes}/${ano}`;
}

interface ChartRow {
  mes: string;
  [cartao: string]: number | string;
}

export function ParcelasTimelineChart({ data }: { data: ParcelaTimeline[] }) {
  if (data.length === 0) return null;

  // Deduplica cartões preservando ordem de aparição
  const cartoesOrdenados: string[] = [];
  const cartaoSet = new Set<string>();
  for (const row of data) {
    if (!cartaoSet.has(row.cartao)) {
      cartaoSet.add(row.cartao);
      cartoesOrdenados.push(row.cartao);
    }
  }

  // Agrupa por mês e preserva o breakdown detalhado para o tooltip.
  const mesesMap = new Map<string, ChartRow>();
  const breakdownsByMes = new Map<string, ParcelaTimeline[]>();
  for (const row of data) {
    const mesLabel = formatMesRef(row.mes_referencia);
    if (!mesesMap.has(mesLabel)) {
      const entry: ChartRow = { mes: mesLabel };
      for (const c of cartoesOrdenados) entry[c] = 0;
      mesesMap.set(mesLabel, entry);
      breakdownsByMes.set(mesLabel, []);
    }
    const entry = mesesMap.get(mesLabel)!;
    entry[row.cartao] = (Number(entry[row.cartao] ?? 0)) + row.total_parcelas_mes;
    breakdownsByMes.get(mesLabel)!.push(row);
  }

  const rows = Array.from(mesesMap.values());

  function TimelineTooltip({ active, label }: { active?: boolean; label?: string | number }) {
    if (!active || label === undefined) return null;
    const mes = String(label);
    const entries = breakdownsByMes.get(mes) ?? [];
    const total = entries.reduce((sum, item) => sum + item.total_parcelas_mes, 0);

    return (
      <div
        style={{
          maxWidth: 320,
          maxHeight: 320,
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border-hairline)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
          fontSize: "0.8rem",
          padding: "var(--space-sm)",
          boxShadow: "var(--shadow-md)",
          overflowY: "auto",
        }}
      >
        <p style={{ margin: "0 0 var(--space-xs)", fontWeight: 700 }}>
          {mes}: {formatBRL(total)}
        </p>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={`${mes}-${entry.account_id}`}>
              <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-body)" }}>
                {entry.cartao}: {formatBRL(entry.total_parcelas_mes)}
              </p>
              {entry.breakdown.map((item, index) => (
                <p
                  key={`${entry.account_id}-${item.description}-${index}`}
                  style={{
                    margin: "2px 0 0",
                    color: "var(--color-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={item.description}
                >
                  {item.description}: {formatBRL(item.installment_amount)}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8 }}>
          <CartesianGrid
            stroke="var(--color-border-hairline)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
          />
          <YAxis
            tickFormatter={formatBRLShort}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={{ stroke: "var(--color-border-hairline)" }}
            width={58}
          />
          <Tooltip content={<TimelineTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "0.78rem", color: "var(--color-text-body)" }}
          />
          {cartoesOrdenados.map((cartao, idx) => (
            <Bar
              key={cartao}
              dataKey={cartao}
              stackId="parcelas"
              fill={PALETTE[idx % PALETTE.length]}
              radius={
                idx === cartoesOrdenados.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
