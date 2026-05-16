import { useState, useEffect } from "react";
import { Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, useMediaQuery } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { fetchForecastMessage, fetchForecastGroups, fetchForecastCategories } from "../api/client.ts";
import type { ForecastMessage, ForecastGroupsResponse, ForecastCategoriesResponse } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { formatBRL } from "../utils/format.ts";

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function ForecastBarChart({ groupsData }: { groupsData: ForecastGroupsResponse }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const { months, has_forecast } = groupsData;

  const allMonths = Array.from(
    new Map(months.map((m) => [`${m.year}-${m.month}`, { year: m.year, month: m.month, type: m.type }])).values()
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
        yAxis={[{ valueFormatter: (v: number) => formatBRL(v) }]}
        series={series.map((s, i) => ({
          ...s,
          valueFormatter: (v: number | null) => (v !== null ? formatBRL(v) : ""),
          color: ["#1976d2", "#f59e0b", "#22c55e"][i % 3],
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
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Categoria</TableCell>
          <TableCell>Grupo</TableCell>
          <TableCell align="right">Real (mês atual)</TableCell>
          <TableCell align="right">Previsto (próx. mês)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {categories.map(({ group_pt, category_pt }) => {
          const real = realMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
          const forecast = forecastMonths.find((m) => m.group_pt === group_pt && m.category_pt === category_pt);
          return (
            <TableRow key={`${group_pt}|${category_pt}`}>
              <TableCell>{category_pt || "—"}</TableCell>
              <TableCell>{group_pt}</TableCell>
              <TableCell align="right">{real ? formatBRL(real.amount) : "—"}</TableCell>
              <TableCell align="right">{forecast ? formatBRL(forecast.amount) : "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
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

  return (
    <div className="mt-4 space-y-3">
      {/* Seção 1: Card de mensagem AI */}
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
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

      {/* Seção 2: Gráfico de grupos */}
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
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

      {/* Seção 3: Tabela de categorias */}
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
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
