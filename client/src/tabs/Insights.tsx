import { useState, useEffect } from "react";
import { Paper, Typography } from "@mui/material";
import { fetchTransacoes } from "../api/client.ts";
import type { Digest, Transacao } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { NotableExpenses } from "../components/NotableExpenses.tsx";
import { AnomaliasList } from "../components/AnomaliasList.tsx";

const ANOMALY_THRESHOLD = 0.6;
const MAX_ANOMALIAS = 10;

export function Insights({ month, digest }: { month: string; digest: Digest | null }) {
  const [anomalias, setAnomalias] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTransacoes(month, 100)
      .then(({ items }) => {
        const filtered = items
          .filter((t) => (t.anomaly_score ?? 0) > ANOMALY_THRESHOLD)
          .sort((a, b) => (b.anomaly_score ?? 0) - (a.anomaly_score ?? 0))
          .slice(0, MAX_ANOMALIAS);
        setAnomalias(filtered);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar transações");
        setLoading(false);
      });
  }, [month]);

  if (loading) return <LoadingCard title="Carregando Insights..." />;
  if (error) return <ErrorCard message={error} />;

  return (
    <div className="mt-4 space-y-3">
      {digest ? (
        <>
          <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">📖 Análise do Mês</Typography>
            <FlagPills flags={digest.flags} />
            {digest.narrative_pt && (
              <Typography variant="body2" color="text.primary" sx={{ mt: 1.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {digest.narrative_pt}
              </Typography>
            )}
          </Paper>

          {digest.notable_expenses && digest.notable_expenses.length > 0 && (
            <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">📌 Destaques notáveis</Typography>
              <NotableExpenses expenses={digest.notable_expenses} />
            </Paper>
          )}
        </>
      ) : (
        <Paper elevation={1} sx={{ borderRadius: 2, p: 2, bgcolor: "background.paper" }}>
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            Análise de IA não disponível para este mês.
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
            Execute: bun run digest --month {month}
          </Typography>
        </Paper>
      )}

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">⚡ Anomalias detectadas</Typography>
        <AnomaliasList transacoes={anomalias} />
      </Paper>
    </div>
  );
}

