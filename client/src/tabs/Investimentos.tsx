import { useState, useEffect } from "react";
import { Paper, Typography } from "@mui/material";
import { fetchPatrimonio, fetchInvestimentos } from "../api/client.ts";
import type { Patrimonio, InvestimentoMensal } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { PatrimonioDonut } from "../components/PatrimonioDonut.tsx";
import { InvestimentosBarChart } from "../components/InvestimentosBarChart.tsx";
import { formatBRL } from "../utils/format.ts";

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
    <div className="mt-4 space-y-3">
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
          Patrimônio Total
        </Typography>
        <Typography variant="h4" color="primary.main" fontWeight={700}>
          {formatBRL(patrimonio?.total_patrimonio ?? 0)}
        </Typography>
        {patrimonio && <PatrimonioDonut contas={patrimonio.items} />}
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">
          Movimentações (últimos 6 meses)
        </Typography>
        <InvestimentosBarChart data={investimentos} />
      </Paper>
    </div>
  );
}

