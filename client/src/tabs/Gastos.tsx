import { useState, useEffect, useCallback } from "react";
import { fetchGastos, fetchTendencias, fetchBudgets } from "../api/client.ts";
import type { GastosMensais, Tendencias, BudgetExecution } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { GruposDonut } from "../components/GruposDonut.tsx";
import { CategoriaBarList } from "../components/CategoriaBarList.tsx";
import { NovosGastos } from "../components/NovosGastos.tsx";
import { TendenciasGrupos } from "../components/TendenciasGrupos.tsx";
import { TendenciasRecorrentes } from "../components/TendenciasRecorrentes.tsx";
import { BudgetCard } from "../components/BudgetCard.tsx";
import { ExportModal } from "../components/ExportModal.tsx";
import { formatBRL } from "../utils/format.ts";

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};
const captionStyle = {
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: 0.9,
  fontWeight: 600,
  color: "var(--color-text-body)",
  margin: 0,
};
const captionMutedStyle = { ...captionStyle, letterSpacing: 0.8, color: "var(--color-muted-strong)" };

export function Gastos({ month }: { month: string }) {
  const [data, setData] = useState<GastosMensais | null>(null);
  const [tendencias, setTendencias] = useState<Tendencias | null>(null);
  const [budgets, setBudgets] = useState<BudgetExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const loadBudgets = useCallback(() => {
    fetchBudgets().then(setBudgets).catch(() => setBudgets([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchGastos(month),
      fetchTendencias().catch(() => null),
      fetchBudgets().catch(() => []),
    ])
      .then(([d, t, b]) => { setData(d); setTendencias(t); setBudgets(b); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar gastos");
        setLoading(false);
      });
  }, [month]);

  if (loading) return <LoadingCard title="Carregando Gastos..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <ErrorCard message="Dados não disponíveis." />;

  const totalGasto = data.grupos.reduce((sum, g) => sum + g.total_gastos, 0);
  const grupos = data.grupos.map((g) => g.group_pt);

  // Calcular dateFrom/dateTo do mês selecionado
  const [monthYear, monthNum] = month.split("-");
  const y = parseInt(monthYear ?? "", 10);
  const m = parseInt(monthNum ?? "", 10);
  const lastDay = isNaN(y) || isNaN(m) ? 28 : new Date(y, m, 0).getDate();
  const dateFrom = isNaN(y) || isNaN(m) ? "" : `${y}-${String(m).padStart(2, "0")}-01`;
  const dateTo = isNaN(y) || isNaN(m) ? "" : `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div className="mt-4 space-y-4">
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        grupos={grupos}
      />
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <p style={captionStyle}>Total Gasto</p>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setExportOpen(true)}
            style={{ marginTop: "-0.25rem" }}
          >
            Exportar
          </button>
        </div>
        <p
          data-testid="gastos-total"
          data-tone="negative"
          style={{
            color: "var(--color-trading-down)",
            fontWeight: 700,
            marginTop: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            fontSize: "2rem",
            lineHeight: 1.1,
            margin: 0,
            marginBlockStart: "var(--space-xs)",
          }}
        >
          {formatBRL(totalGasto)}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "var(--space-xs)" }}>
          Consolidado dos grupos para o mês selecionado.
        </p>
      </div>

      <div style={cardStyle}>
        <p style={captionMutedStyle}>Por onde foi</p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <GruposDonut grupos={data.grupos} />
        </div>
      </div>

      <div style={cardStyle}>
        <p style={captionMutedStyle}>Por categoria</p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <CategoriaBarList categorias={data.categorias} />
        </div>
      </div>

      {data.novos.length > 0 && (
        <div style={cardStyle}>
          <p style={captionMutedStyle}>Novos este mês</p>
          <div style={{ marginTop: "var(--space-xs)" }}>
            <NovosGastos novos={data.novos} />
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <BudgetCard
          budgets={budgets}
          categorias={data.categorias}
          onRefresh={loadBudgets}
        />
      </div>

      {tendencias && (
        <>
          <div style={cardStyle}>
            <p style={captionMutedStyle}>Média 3 meses</p>
            <div style={{ marginTop: "var(--space-xs)" }}>
              <TendenciasGrupos grupos={tendencias.grupos} />
            </div>
          </div>

          <div style={cardStyle}>
            <p style={captionMutedStyle}>Recorrentes identificados</p>
            <div style={{ marginTop: "var(--space-xs)" }}>
              <TendenciasRecorrentes recorrentes={tendencias.recorrentes} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
