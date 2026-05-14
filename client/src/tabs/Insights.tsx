import { useState, useEffect } from "react";
import { Card, Text } from "@tremor/react";
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
      {/* Flags + Narrativa IA */}
      {digest ? (
        <>
          <Card>
            <Text className="text-sm font-medium text-gray-700">📖 Análise do Mês</Text>
            <FlagPills flags={digest.flags} />
            {digest.narrative_pt && (
              <Text className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-wrap">
                {digest.narrative_pt}
              </Text>
            )}
          </Card>

          {digest.notable_expenses && digest.notable_expenses.length > 0 && (
            <Card>
              <Text className="text-sm font-medium text-gray-700">📌 Destaques notáveis</Text>
              <NotableExpenses expenses={digest.notable_expenses} />
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gray-50">
          <Text className="text-gray-400 italic text-sm">
            Análise de IA não disponível para este mês.
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            Execute: <code>bun run digest --month {month}</code>
          </Text>
        </Card>
      )}

      {/* Anomalias */}
      <Card>
        <Text className="text-sm font-medium text-gray-700">⚡ Anomalias detectadas</Text>
        <AnomaliasList transacoes={anomalias} />
      </Card>
    </div>
  );
}

