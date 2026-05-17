import { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { fetchGastos, fetchTendencias } from "../api/client.ts";
import type { GastosMensais, Tendencias } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { GruposDonut } from "../components/GruposDonut.tsx";
import { CategoriaBarList } from "../components/CategoriaBarList.tsx";
import { NovosGastos } from "../components/NovosGastos.tsx";
import { TendenciasGrupos } from "../components/TendenciasGrupos.tsx";
import { TendenciasRecorrentes } from "../components/TendenciasRecorrentes.tsx";
import { formatBRL } from "../utils/format.ts";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap caption → valor (h3): mt: "var(--space-xs)"
// - gap valor → body2: mt: "var(--space-xs)"
// - gap caption → componente filho: <Box sx={{ mt: "var(--space-xs)" }}>
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

export function Gastos({ month }: { month: string }) {
  const [data, setData] = useState<GastosMensais | null>(null);
  const [tendencias, setTendencias] = useState<Tendencias | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchGastos(month),
      fetchTendencias().catch(() => null),
    ])
      .then(([d, t]) => { setData(d); setTendencias(t); setLoading(false); })
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
    <div className="mt-4 space-y-4">
      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "var(--color-text-body)", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 }}
        >
          Total Gasto
        </Typography>
        <Typography
          data-testid="gastos-total"
          data-tone="negative"
          variant="h3"
          sx={{
            color: "var(--color-trading-down)",
            fontWeight: 700,
            mt: "var(--space-xs)",
            fontFamily: "var(--font-family-numeric)",
            lineHeight: 1.1,
          }}
        >
          {formatBRL(totalGasto)}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-muted)", mt: "var(--space-xs)" }}>
          Consolidado dos grupos para o mês selecionado.
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Por onde foi
        </Typography>
        <Box sx={{ mt: "var(--space-xs)" }}>
          <GruposDonut grupos={data.grupos} />
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Por categoria
        </Typography>
        <Box sx={{ mt: "var(--space-xs)" }}>
          <CategoriaBarList categorias={data.categorias} />
        </Box>
      </Paper>

      {data.novos.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "var(--radius-lg)",
            p: "var(--space-md)",
            border: "1px solid var(--color-border-hairline)",
            bgcolor: "var(--color-surface-card)",
          }}
        >
          <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Novos este mês
          </Typography>
          <Box sx={{ mt: "var(--space-xs)" }}>
            <NovosGastos novos={data.novos} />
          </Box>
        </Paper>
      )}

      {tendencias && (
        <>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "var(--radius-lg)",
              p: "var(--space-md)",
              border: "1px solid var(--color-border-hairline)",
              bgcolor: "var(--color-surface-card)",
            }}
          >
            <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Média 3 meses
            </Typography>
            <Box sx={{ mt: "var(--space-xs)" }}>
              <TendenciasGrupos grupos={tendencias.grupos} />
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: "var(--radius-lg)",
              p: "var(--space-md)",
              border: "1px solid var(--color-border-hairline)",
              bgcolor: "var(--color-surface-card)",
            }}
          >
            <Typography variant="caption" sx={{ color: "var(--color-muted-strong)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Recorrentes identificados
            </Typography>
            <Box sx={{ mt: "var(--space-xs)" }}>
              <TendenciasRecorrentes recorrentes={tendencias.recorrentes} />
            </Box>
          </Paper>
        </>
      )}
    </div>
  );
}
