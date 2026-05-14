import { useState, useEffect } from "react";
import { Paper, Typography } from "@mui/material";
import { fetchCashflowProjetado, fetchCompromissos, fetchRunway } from "../api/client.ts";
import type { CashflowProjetado, Compromisso, Runway } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { RunwayIndicator } from "../components/RunwayIndicator.tsx";
import { CashflowAreaChart } from "../components/CashflowAreaChart.tsx";
import { CompromissosLista } from "../components/CompromissosLista.tsx";

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

  return (
    <div className="mt-4 space-y-3">
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <RunwayIndicator runway={runway} />
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">Evolução do cashflow</Typography>
        <CashflowAreaChart data={projetado} />
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">Compromissos em aberto</Typography>
        <CompromissosLista compromissos={compromissos} total={totalComprometido} />
      </Paper>
    </div>
  );
}

