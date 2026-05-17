import { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { fetchCashflow, fetchPatrimonio, fetchRunway } from "../api/client.ts";
import type { CashflowMensal, Digest, Patrimonio, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { DigestNarrative } from "../components/DigestNarrative.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";
import { MetricTooltip } from "../components/MetricTooltip.tsx";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap caption → valor (h3/h6): mt: "var(--space-xs)"
// - gap valor → body2: mt: "var(--space-xs)"
// - gap caption → componente filho: <Box sx={{ mt: "var(--space-xs)" }}>
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

export function Resumo({ month, digest }: { month: string; digest: Digest | null }) {
  const [cashflow, setCashflow] = useState<CashflowMensal | null>(null);
  const [runway, setRunway] = useState<Runway | null>(null);
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="caption"
            sx={{ color: "var(--color-text-body)", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 }}
          >
            Resultado mensal
          </Typography>
          <MetricTooltip title="Receitas reais menos despesas reais do mês. Exclui transferências entre contas e aportes em investimentos." />
        </div>
        <Typography
          data-testid="resumo-resultado"
          variant="h3"
          style={{ color: cashflowColor }}
          sx={{
            fontWeight: 700,
            mt: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            lineHeight: 1.1,
          }}
        >
          {formatBRL(cashflowReal)}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-muted)", mt: "var(--space-xs)" }}>
          Receitas e despesas consolidadas do mês selecionado.
        </Typography>
        <FlagPills flags={digest?.flags} />
      </Paper>

      <DigestNarrative narrative={digest?.narrative_pt} />

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Receitas
              </Typography>
              <MetricTooltip title="Total de entradas de dinheiro no mês (salários, rendimentos, etc.). Transferências entre suas contas não são contadas." />
            </div>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: "var(--space-xs)", color: "var(--color-trading-up)", fontFamily: "var(--font-family-numeric)" }}>
              {formatBRL(receitas)}
            </Typography>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Despesas
              </Typography>
              <MetricTooltip title="Total de saídas de dinheiro no mês (compras, contas, etc.). Transferências entre suas contas e aportes em investimentos não são contados." />
            </div>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: "var(--space-xs)", color: "var(--color-trading-down)", fontFamily: "var(--font-family-numeric)" }}>
              {formatBRL(despesas)}
            </Typography>
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
      </Paper>

      {contasBanco.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "var(--radius-lg)",
            p: "var(--space-md)",
            border: "1px solid var(--color-border-hairline)",
            bgcolor: "var(--color-surface-card)",
          }}
        >
          <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.9 }}>
            Patrimônio em conta
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mt: "var(--space-xs)",
              mb: "var(--space-sm)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-family-numeric)",
            }}
          >
            {formatBRL(totalBanco)}
          </Typography>
          {contasBanco.map((c) => (
            <Box
              key={c.account_id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: "var(--space-xxs)",
                borderTop: "1px solid var(--color-border-hairline)",
              }}
            >
              <Typography variant="body2" sx={{ color: "var(--color-text-body)" }}>
                {c.banco ?? c.nome}{c.dono ? ` (${c.dono.split(" ")[0]})` : ""}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)" }}>
                {formatBRL(c.saldo_atual ?? 0)}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </div>
  );
}
