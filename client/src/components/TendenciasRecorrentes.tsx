import { Box, Chip, Typography } from "@mui/material";
import type { RecorrenteAI } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  recorrentes: RecorrenteAI[];
}

export function TendenciasRecorrentes({ recorrentes }: Props) {
  if (recorrentes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "var(--color-muted)" }}>
        Dados insuficientes — execute o enriquecimento AI para identificar recorrentes.
      </Typography>
    );
  }
  return (
    <Box sx={{ mt: "var(--space-sm)" }}>
      {recorrentes.map((r, index) => (
        <Box
          key={`${r.merchant_name}-${r.category_group_pt}-${index}`}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: "var(--space-sm)",
            px: "var(--space-sm)",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-lg)",
            mb: "var(--space-xs)",
            bgcolor: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent)",
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--color-text-body)" }}>{r.merchant_name}</Typography>
            <Typography variant="caption" sx={{ color: "var(--color-muted)" }}>{r.category_group_pt}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "var(--font-family-numeric)" }}>
              {formatBRL(r.media_valor)}
            </Typography>
            {r.recurrence_period && (
              <Chip
                label={r.recurrence_period}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "var(--color-border-hairline)",
                  color: "var(--color-text-body)",
                  bgcolor: "color-mix(in srgb, var(--color-surface-strong) 60%, transparent)",
                }}
              />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
