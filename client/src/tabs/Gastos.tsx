import { useState, useEffect } from "react";
import { fetchGastos, fetchTendencias } from "../api/client.ts";
import type { GastosMensais, Tendencias } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { GruposDonut } from "../components/GruposDonut.tsx";
import { CategoriaBarList } from "../components/CategoriaBarList.tsx";
import { NovosGastos } from "../components/NovosGastos.tsx";
import { TendenciasGrupos } from "../components/TendenciasGrupos.tsx";
import { TendenciasRecorrentes } from "../components/TendenciasRecorrentes.tsx";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchGastos(month),
      fetchTendencias().catch(() => null),
    ])
      .then(([d, t]) => { setData(d); setTendencias(t); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar gastos");
        setLoading(false);
      });
  }, [month]);

  if (loading) return <LoadingCard title="Carregando Gastos..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <ErrorCard message="Dados não disponíveis." />;

  const totalGasto = data.grupos.reduce((sum, g) => sum + g.total_gastos, 0);

  return (
    <div className="mt-4 space-y-4">
      <div style={cardStyle}>
        <p style={captionStyle}>Total Gasto</p>
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
