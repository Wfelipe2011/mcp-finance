import { Box, Paper, Chip, Typography, LinearProgress } from "@mui/material";
import type { DailyInsight } from "../api/types.ts";

interface DailyInsightCardProps {
  insight: DailyInsight;
}

export function DailyInsightCard({ insight }: DailyInsightCardProps) {
  const prob = insight.probability ?? 0;
  const probPct = Math.round(prob * 100);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: "var(--radius-lg)",
        p: "var(--space-md)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "var(--color-surface-card)",
      }}
    >
      {insight.category_pt && (
        <Chip label={insight.category_pt} size="small" sx={{ mb: 1 }} />
      )}

      <Typography variant="body1" sx={{ mb: 1 }}>
        {insight.message_pt}
      </Typography>

      {insight.probability !== null && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Probabilidade de gasto hoje: {probPct}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={probPct}
            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      {insight.estimated_amount !== null && (
        <Typography variant="body2" color="text.secondary">
          Estimativa: R$ {insight.estimated_amount.toFixed(2)}
          {insight.lower_bound !== null && insight.upper_bound !== null && (
            <span> (R$ {insight.lower_bound.toFixed(2)} – R$ {insight.upper_bound.toFixed(2)})</span>
          )}
        </Typography>
      )}

      {insight.secondary_insights.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Outras categorias prováveis hoje:
          </Typography>
          {insight.secondary_insights.map((si) => (
            <Box key={si.category_pt} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
              <Typography variant="caption">{si.category_pt}</Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(si.probability * 100)}% · R$ {si.estimated_amount.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
