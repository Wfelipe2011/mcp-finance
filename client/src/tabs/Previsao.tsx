import { useState, useEffect } from "react";
import { Box, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, useMediaQuery } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { fetchForecastMessage, fetchForecastGroups, fetchForecastCategories } from "../api/client.ts";
import type { CashflowProjetado, ForecastMessage, ForecastGroupsResponse, ForecastCategoriesResponse } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { CashflowAreaChart } from "../components/CashflowAreaChart.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap caption → valor (h3): mt: "var(--space-xs)"
// - gap valor → body2: mt: "var(--space-xs)"
// - gap caption → componente filho: mb: "var(--space-xs)" na caption ou <Box sx={{ mt: "var(--space-xs)" }}>
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatBRLShort(v: number): string {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

function ForecastBarChart({ groupsData }: { groupsData: ForecastGroupsResponse }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const { months, has_forecast } = groupsData;

  const allMonths = Array.from(
    new Map(months.map((m) => [`${m.year}-${m.month}`, { year: m.year, month: m.month, type: m.type }])).values(),
  ).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const groups = Array.from(new Set(months.map((m) => m.group_pt)));
  const xLabels = allMonths.map((m) => monthLabel(m.year, m.month));

  const series = groups.map((group) => ({
    label: group,
    data: allMonths.map((m) => {
      const entry = months.find((mo) => mo.year === m.year && mo.month === m.month && mo.group_pt === group);
      return entry ? entry.amount : null;
    }),
  }));

  return (
    <>
      <BarChart
        xAxis={[{ scaleType: "band", data: xLabels }]}
        yAxis={[{ valueFormatter: formatBRLShort }]}
        series={series.map((s, i) => ({
          ...s,
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
          color: [
            "var(--color-primary)",
            "var(--color-accent-turquoise)",
            "var(--color-trading-up)",
            "var(--color-info)",
          ][i % 4],
        }))}
        height={220}
        margin={{ left: isMobile ? 52 : 70 }}
      />
      {!has_forecast && (
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 0.5 }}>
          Previsões ainda sendo preparadas
        </Typography>
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

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 320 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.6, fontSize: "0.68rem" }}>Categoria</TableCell>
            <TableCell sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.6, fontSize: "0.68rem" }}>Grupo</TableCell>
            <TableCell align="right" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.6, fontSize: "0.68rem" }}>Real (mês atual)</TableCell>
            <TableCell align="right" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.6, fontSize: "0.68rem" }}>Previsto (próx. mês)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(({ group_pt, category_pt }) => {
            const real = realMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
            const forecast = forecastMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
            return (
              <TableRow key={`${group_pt}|${category_pt}`}>
                <TableCell sx={{ fontSize: "0.75rem", py: "var(--space-xxs)" }}>{category_pt || "—"}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", py: "var(--space-xxs)" }}>{group_pt}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", py: "var(--space-xxs)" }}>{real ? formatBRL(real.amount) : "—"}</TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", py: "var(--space-xxs)" }}>{forecast ? formatBRL(forecast.amount) : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function buildForecastCashflow(months: ForecastGroupsResponse["months"]): CashflowProjetado[] {
  const grouped = new Map<string, { year: number; month: number; month_name_pt: string; is_projected: boolean; saldo: number }>();

  for (const row of months) {
    const key = `${row.year}-${row.month}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        year: row.year,
        month: row.month,
        month_name_pt: monthLabel(row.year, row.month),
        is_projected: row.type === "forecast",
        saldo: 0,
      });
    }
    const current = grouped.get(key)!;
    current.saldo += row.amount;
    current.is_projected = row.type === "forecast";
  }

  return Array.from(grouped.values())
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
    .map((entry) => ({
      year: entry.year,
      month: entry.month,
      month_name_pt: entry.month_name_pt,
      total_receitas: null,
      total_despesas: null,
      saldo_liquido: entry.saldo,
      is_projected: entry.is_projected,
    }));
}

export function Previsao() {
  const [message, setMessage] = useState<ForecastMessage | null>(null);
  const [groupsData, setGroupsData] = useState<ForecastGroupsResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<ForecastCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchForecastMessage(),
      fetchForecastGroups(),
      fetchForecastCategories(),
    ])
      .then(([msg, groups, categories]) => {
        setMessage(msg);
        setGroupsData(groups);
        setCategoriesData(categories);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar previsões");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Previsão..." />;
  if (error) return <ErrorCard message={error} />;

  const messageDate = message?.message_date
    ? new Date(message.message_date).toLocaleDateString("pt-BR")
    : null;
  const forecastMonths = groupsData?.months.filter((m) => m.type === "forecast") ?? [];
  const firstForecast = forecastMonths
    .slice()
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))[0];
  const projectedCashflow = firstForecast
    ? forecastMonths
      .filter((m) => m.year === firstForecast.year && m.month === firstForecast.month)
      .reduce((sum, m) => sum + m.amount, 0)
    : 0;
  const projectedTone = amountToTone(projectedCashflow);
  const projectedColor = projectedTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";
  const cashflowSeries = buildForecastCashflow(groupsData?.months ?? []);

  return (
    <div className="mt-4 space-y-4">
      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-text-body)", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 }}>
          Cashflow projetado
        </Typography>
        <Typography
          data-testid="previsao-kpi-cashflow"
          data-tone={projectedTone}
          variant="h3"
          style={{ color: projectedColor }}
          sx={{
            fontWeight: 700,
            mt: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            lineHeight: 1.1,
          }}
        >
          {formatBRL(projectedCashflow)}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-muted)", mt: "var(--space-xs)" }}>
          Soma prevista do próximo mês disponível no forecast.
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Evolução do cashflow
        </Typography>
        <Box sx={{ mt: "var(--space-xs)" }}>
          {cashflowSeries.length > 0 ? (
            <CashflowAreaChart data={cashflowSeries} />
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              Previsões ainda sendo preparadas. Volte amanhã.
            </Typography>
          )}
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 0.5, mb: "var(--space-xs)" }}>
          <TrendingUpRoundedIcon fontSize="small" />
          Previsão de IA
        </Typography>
        {message?.has_message && message.message_pt ? (
          <>
            <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {message.message_pt}
            </Typography>
            {messageDate && (
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                Atualizado em {messageDate}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            Mensagem de IA ainda sendo preparada. Volte amanhã.
          </Typography>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8, mb: "var(--space-xs)", display: "block" }}>
          Gastos por grupo — real + previsto
        </Typography>
        {groupsData && groupsData.months.length > 0 ? (
          <ForecastBarChart groupsData={groupsData} />
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", py: 2 }}>
            Previsões ainda sendo preparadas
          </Typography>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8, mb: "var(--space-xs)", display: "block" }}>
          Categorias — real vs. previsto
        </Typography>
        {categoriesData && categoriesData.months.length > 0 ? (
          <ForecastTable categoriesData={categoriesData} />
        ) : (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            Previsões ainda sendo preparadas. Volte amanhã.
          </Typography>
        )}
      </Paper>
    </div>
  );
}
