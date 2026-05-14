import { useState, useEffect } from "react";
import { Chip, Paper, Typography } from "@mui/material";
import { fetchCashflow, fetchRunway } from "../api/client.ts";
import type { CashflowMensal, Digest, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { DigestNarrative } from "../components/DigestNarrative.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { formatBRL } from "../utils/format.ts";

export function Resumo({ month, digest }: { month: string; digest: Digest | null }) {
  const [cashflow, setCashflow] = useState<CashflowMensal | null>(null);
  const [runway, setRunway] = useState<Runway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCashflow(month),
      fetchRunway().catch(() => null),
    ])
      .then(([cf, rw]) => {
        setCashflow(cf);
        setRunway(rw);
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
  const isPositive = cashflowReal >= 0;

  return (
    <div className="mt-4 space-y-3">
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
          Resultado do Mês
        </Typography>
        <Typography variant="h4" color={isPositive ? "success.main" : "error.main"} fontWeight={700}>
          {formatBRL(cashflowReal)}
        </Typography>
        <FlagPills flags={digest?.flags} />
      </Paper>

      <DigestNarrative narrative={digest?.narrative_pt} />

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Typography variant="caption" color="text.secondary">Receitas</Typography>
            <Typography variant="body1" fontWeight={600} color="success.dark">
              {formatBRL(cashflow.total_receitas_operacionais ?? cashflow.total_receitas)}
            </Typography>
            {cashflow.total_emprestimos != null && cashflow.total_emprestimos > 0 && (
              <Chip
                label={`+ ${formatBRL(cashflow.total_emprestimos)} (empréstimo)`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ mt: 0.5, fontSize: "0.7rem" }}
              />
            )}
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">Despesas</Typography>
            <Typography variant="body1" fontWeight={600} color="error.dark">{formatBRL(cashflow.total_despesas)}</Typography>
          </div>
        </div>
        <RunwayIndicator runway={runway} />
      </Paper>
    </div>
  );
}
