import { Box, Typography, LinearProgress } from "@mui/material";
import type { GrupoTendencia } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  grupos: GrupoTendencia[];
}

export function TendenciasGrupos({ grupos }: Props) {
  if (grupos.length === 0) {
    return <Typography variant="body2" sx={{ color: "var(--color-muted)" }}>Dados insuficientes.</Typography>;
  }
  const max = Math.max(...grupos.map(g => g.media_mensal));
  return (
    <Box sx={{ mt: "var(--space-sm)" }}>
      {grupos.map((g, index) => {
        const previous = grupos[index + 1]?.media_mensal ?? g.media_mensal;
        const isUp = g.media_mensal >= previous;
        const toneColor = isUp ? "var(--color-trading-up)" : "var(--color-trading-down)";
        const trendIcon = isUp ? "↑" : "↓";

        return (
          <Box
            key={g.group_pt}
            sx={{
              mb: "var(--space-sm)",
              border: "1px solid var(--color-border-hairline)",
              borderRadius: "var(--radius-lg)",
              p: "var(--space-sm)",
              bgcolor: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: "var(--space-xxs)", alignItems: "center" }}>
              <Typography variant="body2" sx={{ color: "var(--color-text-body)" }}>{g.group_pt}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)" }}>
                {formatBRL(g.media_mensal)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", mb: "var(--space-xxs)" }}>
              <span
                data-testid={`tendencia-indicator-${g.group_pt}`}
                data-tone={isUp ? "positive" : "negative"}
                style={{ color: toneColor, fontWeight: 700, lineHeight: 1 }}
              >
                {trendIcon}
              </span>
              <Typography variant="caption" sx={{ color: toneColor, fontWeight: 600 }}>
                {isUp ? "Alta" : "Queda"}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              color="primary"
              value={(g.media_mensal / max) * 100}
              sx={{
                borderRadius: "var(--radius-pill)",
                height: 7,
                backgroundColor: "color-mix(in srgb, var(--color-surface-strong) 70%, transparent)",
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
