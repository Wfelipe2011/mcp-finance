import { useState } from "react";
import { Button, Paper, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

const PREVIEW_LENGTH = 200;

export function DigestNarrative({ narrative }: { narrative: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  if (!narrative) {
    return (
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 1.5, bgcolor: "background.paper" }}>
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          Análise de IA não disponível para este mês.
        </Typography>
      </Paper>
    );
  }

  const isLong = narrative.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? narrative : narrative.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12) }}>
      <Typography variant="body2" sx={{ color: "primary.main", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {displayed}
      </Typography>
      {isLong && (
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, p: 0, minWidth: 0 }}
        >
          {expanded ? "ver menos ↑" : "ver mais ↓"}
        </Button>
      )}
    </Paper>
  );
}
