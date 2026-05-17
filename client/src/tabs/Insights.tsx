import { useState, useEffect, type ReactNode } from "react";
import { Paper, Typography } from "@mui/material";
import { fetchTransacoes } from "../api/client.ts";
import type { Digest, Transacao } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { FlagPills } from "../components/FlagPills.tsx";
import { NotableExpenses } from "../components/NotableExpenses.tsx";
import { AnomaliasList } from "../components/AnomaliasList.tsx";

// Baseline de espaçamento interno (tasks 3.1–3.4):
// - p dos Paper: var(--space-md)
// - gap header (caption+ícone) → conteúdo: mb: "var(--space-xs)" no header div
// - gap entre cards em stack: space-y-4 (Tailwind) — manter

const ANOMALY_THRESHOLD = 0.6;
const MAX_ANOMALIAS = 10;
type InsightTone = "positive" | "negative" | "neutral";

const toneConfig: Record<InsightTone, { color: string; icon: string }> = {
  positive: { color: "var(--color-trading-up)", icon: "▲" },
  negative: { color: "var(--color-trading-down)", icon: "▼" },
  neutral: { color: "var(--color-accent-info)", icon: "●" },
};

function InsightCard({
  title,
  tone,
  testId,
  children,
}: {
  title: string;
  tone: InsightTone;
  testId: string;
  children: ReactNode;
}) {
  const config = toneConfig[tone];

  return (
    <Paper
      elevation={0}
      data-testid={testId}
      sx={{
        borderRadius: "var(--radius-lg)",
        p: "var(--space-md)",
        bgcolor: "var(--color-surface-card)",
        border: `1px solid color-mix(in srgb, ${config.color} 40%, var(--color-border-hairline))`,
      }}
    >
      <div style={{ marginBottom: "var(--space-xs)" }} className="flex items-center gap-2">
        <span
          aria-hidden
          data-testid={`${testId}-indicator`}
          data-tone={tone}
          style={{
            color: config.color,
            fontWeight: 700,
            fontSize: "0.75rem",
            lineHeight: 1,
          }}
        >
          {config.icon}
        </span>
        <Typography
          variant="caption"
          sx={{ color: config.color, textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 }}
        >
          {title}
        </Typography>
      </div>
      {children}
    </Paper>
  );
}

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
    <div className="mt-4 space-y-4">
      <header className="space-y-1 px-[var(--space-xxs)]">
        <Typography variant="h5" sx={{ color: "var(--color-text-primary)", fontWeight: 700 }}>
          Insights
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-muted)" }}>
          Leitura gerada por IA para sinais positivos, alertas e contexto do mês.
        </Typography>
      </header>

      {digest ? (
        <>
          <InsightCard title="Análise do Mês" tone="neutral" testId="insights-card-neutral">
            <FlagPills flags={digest.flags} />
            {digest.narrative_pt && (
              <Typography
                variant="body2"
                sx={{ color: "var(--color-text-body)", mt: "var(--space-sm)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}
              >
                {digest.narrative_pt}
              </Typography>
            )}
          </InsightCard>

          {digest.notable_expenses && digest.notable_expenses.length > 0 && (
            <InsightCard title="Destaques notáveis" tone="positive" testId="insights-card-positive">
              <NotableExpenses expenses={digest.notable_expenses} />
            </InsightCard>
          )}
        </>
      ) : (
        <InsightCard title="Análise do Mês" tone="neutral" testId="insights-card-neutral">
          <Typography variant="body2" sx={{ color: "var(--color-muted)", fontStyle: "italic" }}>
            Análise de IA não disponível para este mês.
          </Typography>
          <Typography variant="caption" sx={{ color: "var(--color-muted)", mt: "var(--space-xs)", display: "block" }}>
            Execute: bun run digest --month {month}
          </Typography>
        </InsightCard>
      )}

      <InsightCard title="Anomalias detectadas" tone="negative" testId="insights-card-negative">
        <AnomaliasList transacoes={anomalias} />
      </InsightCard>
    </div>
  );
}
