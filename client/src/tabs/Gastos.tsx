import { useState, useEffect } from "react";
import { Paper, Typography } from "@mui/material";
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
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
          Total Gasto
        </Typography>
        <Typography variant="h4" color="error.main" fontWeight={700}>{formatBRL(totalGasto)}</Typography>
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">Por onde foi</Typography>
        <GruposDonut grupos={data.grupos} />
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">Por categoria</Typography>
        <CategoriaBarList categorias={data.categorias} />
      </Paper>

      {data.novos.length > 0 && (
        <Paper elevation={1} sx={{ borderRadius: 2, p: 2 }}>
          <Typography variant="body2" fontWeight={600} color="text.primary">🆕 Novos este mês</Typography>
          <NovosGastos novos={data.novos} />
        </Paper>
      )}
    </div>
  );
}

