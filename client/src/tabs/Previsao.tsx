import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchForecastMessage, fetchForecastGroups, fetchForecastCategories, fetchDailyInsight } from "../api/client.ts";
import type { CashflowProjetado, ForecastMessage, ForecastGroupsResponse, ForecastCategoriesResponse, DailyInsight } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { CashflowAreaChart } from "../components/CashflowAreaChart.tsx";
import { DailyInsightCard } from "../components/DailyInsightCard.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatBRLShort(v: number): string {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

const BAR_COLORS = [
  "var(--color-primary)",
  "var(--color-accent-turquoise)",
  "var(--color-trading-up)",
  "var(--color-info)",
];

function ForecastBarChart({ groupsData }: { groupsData: ForecastGroupsResponse }) {
  const { months, has_forecast } = groupsData;

  const allMonths = Array.from(
    new Map(months.map((m) => [`${m.year}-${m.month}`, { year: m.year, month: m.month }])).values(),
  ).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const groups = Array.from(new Set(months.map((m) => m.group_pt)));

  const rows = allMonths.map((m) => {
    const row: Record<string, string | number> = { label: monthLabel(m.year, m.month) };
    for (const group of groups) {
      const entry = months.find((mo) => mo.year === m.year && mo.month === m.month && mo.group_pt === group);
      row[group] = entry ? entry.amount : 0;
    }
    return row;
  });

  return (
    <>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 60 }}>
            <CartesianGrid stroke="var(--color-border-hairline)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--color-border-hairline)" }} tickLine={{ stroke: "var(--color-border-hairline)" }} />
            <YAxis tickFormatter={formatBRLShort} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--color-border-hairline)" }} tickLine={{ stroke: "var(--color-border-hairline)" }} />
            <Tooltip
              contentStyle={{ background: "var(--color-surface-card)", border: "1px solid var(--color-border-hairline)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
              formatter={(v: number, name: string) => [formatBRL(v), name]}
            />
            {groups.map((group, i) => (
              <Bar key={group} dataKey={group} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!has_forecast && (
        <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", textAlign: "center", marginTop: 4, fontStyle: "italic" }}>
          Previsões ainda sendo preparadas
        </p>
      )}
    </>
  );
}

function ForecastTable({ categoriesData }: { categoriesData: ForecastCategoriesResponse }) {
  const { months } = categoriesData;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const realMonths = months.filter((m) => m.type === "real" && m.year === currentYear && m.month === currentMonth);
  const forecastMonths = months.filter((m) => m.type === "forecast" && m.year === nextYear && m.month === nextMonth);

  const categories = Array.from(new Set([...realMonths, ...forecastMonths].map((m) => `${m.group_pt}|${m.category_pt ?? ""}`)))
    .map((key) => {
      const [group_pt, category_pt] = key.split("|") as [string, string];
      return { group_pt, category_pt };
    })
    .sort((a, b) => {
      if (a.group_pt !== b.group_pt) return a.group_pt.localeCompare(b.group_pt);
      const aReal = realMonths.find((m) => m.group_pt === a.group_pt && m.category_pt === a.category_pt)?.amount ?? 0;
      const bReal = realMonths.find((m) => m.group_pt === b.group_pt && m.category_pt === b.category_pt)?.amount ?? 0;
      return bReal - aReal;
    });

  if (categories.length === 0) return null;

  const thStyle = { fontSize: "0.68rem", textTransform: "uppercase" as const, letterSpacing: 0.6, color: "var(--color-muted-strong)", padding: "4px 8px", textAlign: "left" as const };
  const tdStyle = { fontSize: "0.75rem", padding: "4px 8px", borderTop: "1px solid var(--color-border-hairline)", color: "var(--color-text-body)" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ minWidth: 320, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Categoria</th>
            <th style={thStyle}>Grupo</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Real (mês atual)</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Previsto (próx. mês)</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(({ group_pt, category_pt }) => {
            const real = realMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
            const forecast = forecastMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
            return (
              <tr key={`${group_pt}|${category_pt}`}>
                <td style={tdStyle}>{category_pt || "—"}</td>
                <td style={tdStyle}>{group_pt}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-family-numeric)" }}>{real ? formatBRL(real.amount) : "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-family-numeric)" }}>{forecast ? formatBRL(forecast.amount) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildForecastCashflow(months: ForecastGroupsResponse["months"]): CashflowProjetado[] {
  const grouped = new Map<string, { year: number; month: number; month_name_pt: string; is_projected: boolean; saldo: number }>();
  for (const row of months) {
    const key = `${row.year}-${row.month}`;
    if (!grouped.has(key)) {
      grouped.set(key, { year: row.year, month: row.month, month_name_pt: monthLabel(row.year, row.month), is_projected: row.type === "forecast", saldo: 0 });
    }
    const current = grouped.get(key)!;
    current.saldo += row.amount;
    current.is_projected = row.type === "forecast";
  }
  return Array.from(grouped.values())
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
    .map((entry) => ({
      year: entry.year, month: entry.month, month_name_pt: entry.month_name_pt,
      total_receitas: null, total_despesas: null,
      saldo_liquido: entry.saldo, is_projected: entry.is_projected,
    }));
}

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};
const captionStyle = { fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: 0.9, fontWeight: 600, color: "var(--color-text-body)", margin: 0 };
const captionMutedStyle = { ...captionStyle, letterSpacing: 0.8, color: "var(--color-muted-strong)" };

export function Previsao() {
  const [message, setMessage] = useState<ForecastMessage | null>(null);
  const [groupsData, setGroupsData] = useState<ForecastGroupsResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<ForecastCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null | undefined>(undefined);

  useEffect(() => {
    fetchDailyInsight()
      .then((data) => setDailyInsight(data))
      .catch(() => setDailyInsight(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchForecastMessage(), fetchForecastGroups(), fetchForecastCategories()])
      .then(([msg, groups, categories]) => {
        setMessage(msg); setGroupsData(groups); setCategoriesData(categories); setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar previsões");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Previsão..." />;
  if (error) return <ErrorCard message={error} />;

  const messageDate = message?.message_date ? new Date(message.message_date).toLocaleDateString("pt-BR") : null;
  const forecastMonths = groupsData?.months.filter((m) => m.type === "forecast") ?? [];
  const firstForecast = forecastMonths.slice().sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)[0];
  const projectedCashflow = firstForecast
    ? forecastMonths.filter((m) => m.year === firstForecast.year && m.month === firstForecast.month).reduce((sum, m) => sum + m.amount, 0)
    : 0;
  const projectedTone = amountToTone(projectedCashflow);
  const projectedColor = projectedTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";
  const cashflowSeries = buildForecastCashflow(groupsData?.months ?? []);

  return (
    <div className="mt-4 space-y-4">
      {dailyInsight && <DailyInsightCard insight={dailyInsight} />}

      <div style={cardStyle}>
        <p style={captionStyle}>Cashflow projetado</p>
        <p
          data-testid="previsao-kpi-cashflow"
          data-tone={projectedTone}
          style={{ fontWeight: 700, marginTop: "var(--space-xs)", fontFamily: "var(--font-family-numeric)", fontSize: "2rem", lineHeight: 1.1, color: projectedColor }}
        >
          {formatBRL(projectedCashflow)}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "var(--space-xs)" }}>
          Soma prevista do próximo mês disponível no forecast.
        </p>
      </div>

      <div style={cardStyle}>
        <p style={captionMutedStyle}>Evolução do cashflow</p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          {cashflowSeries.length > 0 ? (
            <CashflowAreaChart data={cashflowSeries} />
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontStyle: "italic" }}>
              Previsões ainda sendo preparadas. Volte amanhã.
            </p>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ ...captionMutedStyle, display: "flex", alignItems: "center", gap: 4 }}>
          📈 Previsão de IA
        </p>
        {message?.has_message && message.message_pt ? (
          <>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap", marginTop: "var(--space-xs)" }}>
              {message.message_pt}
            </p>
            {messageDate && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 4 }}>
                Atualizado em {messageDate}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            Mensagem de IA ainda sendo preparada. Volte amanhã.
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <p style={{ ...captionMutedStyle, marginBottom: "var(--space-xs)" }}>Gastos por grupo — real + previsto</p>
        {groupsData && groupsData.months.length > 0 ? (
          <ForecastBarChart groupsData={groupsData} />
        ) : (
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", textAlign: "center", padding: "var(--space-md)" }}>
            Previsões ainda sendo preparadas
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <p style={{ ...captionMutedStyle, marginBottom: "var(--space-xs)" }}>Categorias — real vs. previsto</p>
        {categoriesData && categoriesData.months.length > 0 ? (
          <ForecastTable categoriesData={categoriesData} />
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            Previsões ainda sendo preparadas. Volte amanhã.
          </p>
        )}
      </div>
    </div>
  );
}
