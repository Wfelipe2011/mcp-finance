import { useState, useEffect } from "react";
import { Card, Metric, Text } from "@tremor/react";
import { fetchGastos } from "../api/client.ts";
import type { GastosMensais } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { GruposDonut } from "../components/GruposDonut.tsx";
import { CategoriaBarList } from "../components/CategoriaBarList.tsx";
import { NovosGastos } from "../components/NovosGastos.tsx";
import { formatBRL } from "../utils/format.ts";

export function Gastos({ month }: { month: string }) {
  const [data, setData] = useState<GastosMensais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchGastos(month)
      .then((d) => { setData(d); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar gastos");
        setLoading(false);
      });
  }, [month]);

  if (loading) return <LoadingCard title="Carregando Gastos..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <ErrorCard message="Dados não disponíveis." />;

  const totalGasto = data.grupos.reduce((sum, g) => sum + g.total_gastos, 0);

  return (
    <div className="mt-4 space-y-3">
      <Card>
        <Text className="text-gray-500 text-xs uppercase tracking-wide">Total Gasto</Text>
        <Metric className="text-red-600">{formatBRL(totalGasto)}</Metric>
      </Card>

      <Card>
        <Text className="text-sm font-medium text-gray-700">Por onde foi</Text>
        <GruposDonut grupos={data.grupos} />
      </Card>

      <Card>
        <Text className="text-sm font-medium text-gray-700">Por categoria</Text>
        <CategoriaBarList categorias={data.categorias} />
      </Card>

      {data.novos.length > 0 && (
        <Card>
          <Text className="text-sm font-medium text-gray-700">🆕 Novos este mês</Text>
          <NovosGastos novos={data.novos} />
        </Card>
      )}
    </div>
  );
}

