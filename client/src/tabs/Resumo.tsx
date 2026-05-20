import { useState, useEffect } from "react";
import { fetchCashflow, fetchPatrimonio, fetchRunway, fetchInsightToday } from "../api/client.ts";
import type { CashflowMensal, Digest, InsightToday, Patrimonio, Runway } from "../api/types.ts";
import { CardInsightDia } from "../components/CardInsightDia.tsx";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { DigestNarrative } from "../components/DigestNarrative.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";
import { MetricTooltip } from "../components/MetricTooltip.tsx";

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
};
const captionMutedStyle = { ...captionStyle, letterSpacing: 0.8, color: "var(--color-muted-strong)" };

export function Resumo({ month, digest, onNavigateToInsights }: { month: string; digest: Digest | null; onNavigateToInsights?: () => void }) {
  const [cashflow, setCashflow] = useState<CashflowMensal | null>(null);
  const [runway, setRunway] = useState<Runway | null>(null);
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightToday | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCashflow(month),
      fetchRunway().catch(() => null),
      fetchPatrimonio().catch(() => null),
    ])
      .then(([cf, rw, pat]) => {
        setCashflow(cf);
        setRunway(rw);
        setPatrimonio(pat);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        setLoading(false);
      });
  }, [month]);

  useEffect(() => {
    fetchInsightToday().then(setInsight).catch(() => null);
  }, []);

  if (loading) return <LoadingCard title="Carregando Resumo..." />;
  if (error) return <ErrorCard message={error} />;
  if (!cashflow) return <ErrorCard message="Dados não disponíveis para este mês." />;

  const cashflowReal = digest?.cashflow_real ?? cashflow.saldo_liquido;
  const cashflowTone = amountToTone(cashflowReal);
  const cashflowColor = cashflowTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";
  const receitas = cashflow.total_receitas_operacionais ?? cashflow.total_receitas;
  const despesas = cashflow.total_despesas;
  const contasBanco = patrimonio?.items.filter((c) => c.tipo === "BANK" && (c.saldo_atual ?? 0) > 0) ?? [];
  const totalBanco = contasBanco.reduce((sum, c) => sum + (c.saldo_atual ?? 0), 0);

  return (
    <div className="mt-4 space-y-4">
      {insight?.type != null && insight.text && (
        <CardInsightDia
          type={insight.type}
          text={insight.text}
          score={insight.score}
          onVerDetalhes={() => onNavigateToInsights?.()}
        />
      )}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <p style={captionStyle}>Resultado mensal</p>
          <MetricTooltip title="Receitas reais menos despesas reais do mês. Exclui transferências entre contas e aportes em investimentos." />
        </div>
        <p
          data-testid="resumo-resultado"
          style={{
            fontWeight: 700,
            marginTop: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            fontSize: "2rem",
            lineHeight: 1.1,
            color: cashflowColor,
          }}
        >
          {formatBRL(cashflowReal)}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "var(--space-xs)" }}>
          Receitas e despesas consolidadas do mês selecionado.
        </p>
        <FlagPills flags={digest?.flags} />
      </div>

      <DigestNarrative narrative={digest?.narrative_pt} />

      <div style={cardStyle}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <p style={captionMutedStyle}>Receitas</p>
              <MetricTooltip title="Total de entradas de dinheiro no mês (salários, rendimentos, etc.). Transferências entre suas contas não são contadas." />
            </div>
            <p style={{ fontWeight: 700, marginTop: "var(--space-xs)", color: "var(--color-trading-up)", fontFamily: "var(--font-family-numeric)", fontSize: "1.15rem" }}>
              {formatBRL(receitas)}
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <p style={captionMutedStyle}>Despesas</p>
              <MetricTooltip title="Total de saídas de dinheiro no mês (compras, contas, etc.). Transferências entre suas contas e aportes em investimentos não são contados." />
            </div>
            <p style={{ fontWeight: 700, marginTop: "var(--space-xs)", color: "var(--color-trading-down)", fontFamily: "var(--font-family-numeric)", fontSize: "1.15rem" }}>
              {formatBRL(despesas)}
            </p>
          </div>
          <div className="sm:col-span-2">
            {cashflow.total_emprestimos != null && cashflow.total_emprestimos > 0 ? (
              <span
                style={{
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid color-mix(in srgb, var(--color-info) 55%, var(--color-border-hairline))",
                  color: "var(--color-info)",
                  backgroundColor: "color-mix(in srgb, var(--color-info) 14%, transparent)",
                  padding: "2px var(--space-sm)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                + {formatBRL(cashflow.total_emprestimos)} (empréstimo)
              </span>
            ) : null}
            <RunwayIndicator runway={runway} />
          </div>
        </div>
      </div>

      {contasBanco.length > 0 && (
        <div style={cardStyle}>
          <p style={captionMutedStyle}>Patrimônio em conta</p>
          <p
            style={{
              fontWeight: 700,
              marginTop: "var(--space-xs)",
              marginBottom: "var(--space-sm)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-family-numeric)",
              fontSize: "1.3rem",
            }}
          >
            {formatBRL(totalBanco)}
          </p>
          {contasBanco.map((c) => (
            <div
              key={c.account_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "var(--space-xxs)",
                paddingBottom: "var(--space-xxs)",
                borderTop: "1px solid var(--color-border-hairline)",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", margin: 0 }}>
                {c.banco ?? c.nome}{c.dono ? ` (${c.dono.split(" ")[0]})` : ""}
              </p>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)", margin: 0 }}>
                {formatBRL(c.saldo_atual ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
