import { useState, useEffect } from "react";
import { fetchCashflowProjetado, fetchCompromissos, fetchRunway } from "../api/client.ts";
import type { CashflowProjetado, Compromisso, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { CashflowAreaChart } from "../components/CashflowAreaChart.tsx";
import { CompromissosLista } from "../components/CompromissosLista.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};

export function ProximoMes() {
  const [projetado, setProjetado] = useState<CashflowProjetado[]>([]);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [runway, setRunway] = useState<Runway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCashflowProjetado(),
      fetchCompromissos(),
      fetchRunway().catch(() => null),
    ])
      .then(([pr, co, rw]) => {
        setProjetado(pr);
        setCompromissos(co);
        setRunway(rw);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Próximo Mês..." />;
  if (error) return <ErrorCard message={error} />;

  const totalComprometido = compromissos.reduce((sum, c) => sum + c.compromisso_restante, 0);
  const latestProjected =
    [...projetado].reverse().find((row) => row.is_projected && row.saldo_liquido !== null)?.saldo_liquido ??
    [...projetado].reverse().find((row) => row.saldo_liquido !== null)?.saldo_liquido ??
    0;
  const projectionTone = amountToTone(latestProjected);
  const projectionColor = projectionTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";

  return (
    <div className="mt-4 space-y-4">
      <div style={cardStyle}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600, color: "var(--color-text-body)", margin: 0 }}>
          Próximo mês
        </p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>
              Projeção de cashflow
            </p>
            <p
              data-testid="proximo-mes-kpi-projecao"
              data-tone={projectionTone}
              style={{
                color: projectionColor,
                fontWeight: 700,
                marginTop: "var(--space-xs)",
                fontFamily: "var(--font-family-numeric)",
                fontSize: "2rem",
                lineHeight: 1.1,
              }}
            >
              {formatBRL(latestProjected)}
            </p>
          </div>
          <div>
            <p data-testid="proximo-mes-compromissos-title" style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>
              Compromissos em aberto
            </p>
            <p
              data-testid="proximo-mes-kpi-compromissos"
              style={{
                color: "var(--color-text-primary)",
                fontWeight: 700,
                marginTop: "var(--space-xs)",
                fontFamily: "var(--font-family-numeric)",
                fontSize: "1.4rem",
                lineHeight: 1.1,
              }}
            >
              {formatBRL(totalComprometido)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: 0 }}>
              {compromissos.length} compromisso(s) ativo(s)
            </p>
          </div>
        </div>
        <div className="mt-4">
          <RunwayIndicator runway={runway} />
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, color: "var(--color-muted-strong)", margin: 0 }}>
          Evolução do cashflow
        </p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <CashflowAreaChart data={projetado} />
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, color: "var(--color-muted-strong)", margin: 0 }}>
          Compromissos em aberto
        </p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <CompromissosLista compromissos={compromissos} total={totalComprometido} />
        </div>
      </div>
    </div>
  );
}
