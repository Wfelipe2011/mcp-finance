import { Box, Typography, LinearProgress } from "@mui/material";
import type { GrupoTendencia } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  grupos: GrupoTendencia[];
}

export function TendenciasGrupos({ grupos }: Props) {
  if (grupos.length === 0) {
    return <Typography variant="body2" color="text.secondary">Dados insuficientes.</Typography>;
  }
  const max = Math.max(...grupos.map(g => g.media_mensal));
  return (
    <Box sx={{ mt: 1 }}>
      {grupos.map(g => (
        <Box key={g.group_pt} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2" color="text.primary">{g.group_pt}</Typography>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              {formatBRL(g.media_mensal)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(g.media_mensal / max) * 100}
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>
      ))}
    </Box>
  );
}
