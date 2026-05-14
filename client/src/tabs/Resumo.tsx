import { useState, useEffect } from "react";
import { Card, Metric, Text } from "@tremor/react";
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
      {/* Cashflow principal */}
      <Card>
        <Text className="text-gray-500 text-xs uppercase tracking-wide">Resultado do Mês</Text>
        <Metric className={isPositive ? "text-emerald-600" : "text-red-600"}>
          {formatBRL(cashflowReal)}
        </Metric>
        <FlagPills flags={digest?.flags} />
      </Card>

      {/* Narrativa IA */}
      <DigestNarrative narrative={digest?.narrative_pt} />

      {/* Receitas e Despesas */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Text className="text-xs text-gray-500">Receitas</Text>
            <Text className="font-semibold text-emerald-700">{formatBRL(cashflow.total_receitas)}</Text>
          </div>
          <div>
            <Text className="text-xs text-gray-500">Despesas</Text>
            <Text className="font-semibold text-red-700">{formatBRL(cashflow.total_despesas)}</Text>
          </div>
        </div>
        <RunwayIndicator runway={runway} />
      </Card>
    </div>
  );
}


