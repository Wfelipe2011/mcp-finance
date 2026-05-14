import { useState } from "react";
import { Button, Paper, Typography } from "@mui/material";

const PREVIEW_LENGTH = 200;

export function DigestNarrative({ narrative }: { narrative: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!narrative) {
    return (
      <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 1.5, bgcolor: "grey.50" }}>
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          Análise de IA não disponível para este mês.
        </Typography>
      </Paper>
    );
  }

  const isLong = narrative.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? narrative : narrative.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 1.5, bgcolor: "primary.50" }}>
      <Typography variant="body2" sx={{ color: "primary.dark", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
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
