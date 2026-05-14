import { useState, useEffect } from "react";
import { Card, Metric, Text } from "@tremor/react";
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
      <Card>
        <Text className="text-gray-500 text-xs uppercase tracking-wide">Patrimônio Total</Text>
        <Metric className="text-blue-700">{formatBRL(patrimonio?.total_patrimonio ?? 0)}</Metric>
        {patrimonio && <PatrimonioDonut contas={patrimonio.items} />}
      </Card>

      <Card>
        <Text className="text-sm font-medium text-gray-700">Movimentações (últimos 6 meses)</Text>
        <InvestimentosBarChart data={investimentos} />
      </Card>
    </div>
  );
}

