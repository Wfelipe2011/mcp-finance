import { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { fetchCashflowProjetado, fetchCompromissos, fetchRunway } from "../api/client.ts";
import type { CashflowProjetado, Compromisso, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { CashflowAreaChart } from "../components/CashflowAreaChart.tsx";
import { CompromissosLista } from "../components/CompromissosLista.tsx";
import { formatBRL } from "../utils/format.ts";
import { amountToTone } from "../utils/semanticTone.ts";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap caption → valor (h3/h5): mt: "var(--space-xs)"
// - gap caption → componente filho: <Box sx={{ mt: "var(--space-xs)" }}>
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

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
  const latestProjected = [...projetado]
    .reverse()
    .find((row) => row.is_projected && row.saldo_liquido !== null)?.saldo_liquido
    ?? [...projetado].reverse().find((row) => row.saldo_liquido !== null)?.saldo_liquido
    ?? 0;
  const projectionTone = amountToTone(latestProjected);
  const projectionColor = projectionTone === "negative" ? "var(--color-trading-down)" : "var(--color-trading-up)";

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
        <Typography
          variant="caption"
          sx={{ color: "var(--color-text-body)", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 }}
        >
          Próximo mês
        </Typography>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography variant="body2" sx={{ color: "var(--color-muted)" }}>
              Projeção de cashflow
            </Typography>
            <Typography
              data-testid="proximo-mes-kpi-projecao"
              data-tone={projectionTone}
              variant="h3"
              sx={{
                color: projectionColor,
                fontWeight: 700,
                mt: "var(--space-xs)",
                fontFamily: "var(--font-family-numeric)",
                lineHeight: 1.1,
              }}
            >
              {formatBRL(latestProjected)}
            </Typography>
          </div>
          <div>
            <Typography data-testid="proximo-mes-compromissos-title" variant="body2" sx={{ color: "var(--color-muted)" }}>
              Compromissos em aberto
            </Typography>
            <Typography
              data-testid="proximo-mes-kpi-compromissos"
              variant="h5"
              sx={{
                color: "var(--color-text-primary)",
                fontWeight: 700,
                mt: "var(--space-xs)",
                fontFamily: "var(--font-family-numeric)",
                lineHeight: 1.1,
              }}
            >
              {formatBRL(totalComprometido)}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--color-muted)" }}>
              {compromissos.length} compromisso(s) ativo(s)
            </Typography>
          </div>
        </div>
        <div className="mt-4">
          <RunwayIndicator runway={runway} />
        </div>
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
          <CashflowAreaChart data={projetado} />
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
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Compromissos em aberto
        </Typography>
        <Box sx={{ mt: "var(--space-xs)" }}>
          <CompromissosLista compromissos={compromissos} total={totalComprometido} />
        </Box>
      </Paper>

    </div>
  );
}
