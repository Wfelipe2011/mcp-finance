import { Box, Chip, Typography } from "@mui/material";
import type { RecorrenteAI } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  recorrentes: RecorrenteAI[];
}

export function TendenciasRecorrentes({ recorrentes }: Props) {
  if (recorrentes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Dados insuficientes — execute o enriquecimento AI para identificar recorrentes.
      </Typography>
    );
  }
  return (
    <Box sx={{ mt: 1 }}>
      {recorrentes.map(r => (
        <Box
          key={r.merchant_name}
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Box>
            <Typography variant="body2" fontWeight={500}>{r.merchant_name}</Typography>
            <Typography variant="caption" color="text.secondary">{r.category_group_pt}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>{formatBRL(r.media_valor)}</Typography>
            {r.recurrence_period && (
              <Chip label={r.recurrence_period} size="small" variant="outlined" />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
