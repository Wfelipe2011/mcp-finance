import { useState } from "react";
import { Button, Paper, Typography } from "@mui/material";

const PREVIEW_LENGTH = 200;

export function DigestNarrative({ narrative }: { narrative: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!narrative) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: "var(--radius-lg)",
          p: "var(--space-md)",
          mt: "var(--space-sm)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography variant="body2" sx={{ color: "var(--color-muted)", fontStyle: "italic" }}>
          Análise de IA não disponível para este mês.
        </Typography>
      </Paper>
    );
  }

  const isLong = narrative.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? narrative : narrative.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "var(--radius-lg)",
        p: "var(--space-md)",
        mt: "var(--space-sm)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "color-mix(in srgb, var(--color-accent-turquoise) 10%, var(--color-surface-card))",
      }}
    >
      <Typography variant="body1" sx={{ color: "var(--color-text-body)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {displayed}
      </Typography>
      {isLong && (
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: "var(--space-xs)", p: 0, minWidth: 0, color: "var(--color-primary)" }}
        >
          {expanded ? "ver menos ↑" : "ver mais ↓"}
        </Button>
      )}
    </Paper>
  );
}
