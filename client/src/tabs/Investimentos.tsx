import { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { fetchPatrimonio, fetchInvestimentos } from "../api/client.ts";
import type { Patrimonio, InvestimentoMensal } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { PatrimonioDonut } from "../components/PatrimonioDonut.tsx";
import { InvestimentosBarChart } from "../components/InvestimentosBarChart.tsx";
import { formatBRL } from "../utils/format.ts";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap caption → valor (h1): mt: "var(--space-xs)"
// - gap valor → body2: mt: "var(--space-xs)"
// - gap caption → componente filho: <Box sx={{ mt: "var(--space-xs)" }}>
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

export function Investimentos({ month: _month }: { month: string }) {
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [investimentos, setInvestimentos] = useState<InvestimentoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchPatrimonio(), fetchInvestimentos(6)])
      .then(([pt, inv]) => {
        setPatrimonio(pt);
        setInvestimentos(inv);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar investimentos");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Investimentos..." />;
  if (error) return <ErrorCard message={error} />;

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
          Patrimônio Total
        </Typography>
        <Typography
          data-testid="investimentos-patrimonio-total"
          variant="h1"
          sx={{
            fontWeight: 700,
            mt: "var(--space-xs)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-family-numeric)",
            lineHeight: 1.1,
          }}
        >
          {formatBRL(patrimonio?.total_patrimonio ?? 0)}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-muted)", mt: "var(--space-xxs)", mb: "var(--space-sm)" }}>
          Distribuição consolidada por tipo de conta.
        </Typography>
        {patrimonio && <PatrimonioDonut contas={patrimonio.items} />}
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
        <Typography
          variant="caption"
          sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}
        >
          Movimentações (últimos 6 meses)
        </Typography>
        <Box sx={{ mt: "var(--space-xs)" }}>
          <InvestimentosBarChart data={investimentos} />
        </Box>
      </Paper>
    </div>
  );
}
