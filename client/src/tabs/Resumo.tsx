import { useState, useEffect } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { fetchCashflow, fetchPatrimonio, fetchRunway } from "../api/client.ts";
import type { CashflowMensal, Digest, Patrimonio, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { DigestNarrative } from "../components/DigestNarrative.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { formatBRL } from "../utils/format.ts";

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

      {patrimonio && (() => {
        const contasBanco = patrimonio.items.filter(
          (c) => c.tipo === "BANK" && (c.saldo_atual ?? 0) > 0
        );
        const totalBanco = contasBanco.reduce((sum, c) => sum + (c.saldo_atual ?? 0), 0);
        if (contasBanco.length === 0) return null;
        return (
          <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
              Saldo em Conta
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, mb: 1.5 }}>
              {formatBRL(totalBanco)}
            </Typography>
            {contasBanco.map((c) => (
              <Box key={c.account_id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {c.banco ?? c.nome}{c.dono ? ` (${c.dono.split(" ")[0]})` : ""}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatBRL(c.saldo_atual ?? 0)}
                </Typography>
              </Box>
            ))}
          </Paper>
        );
      })()}
    </div>
  );
}
