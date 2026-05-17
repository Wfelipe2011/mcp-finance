import { Paper, Typography } from "@mui/material";

export function ErrorCard({ message }: { message: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mt: "var(--space-sm)",
        px: "var(--space-md)",
        py: "var(--space-sm)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-trading-down)",
        bgcolor: "var(--color-surface-card)",
      }}
    >
      <Typography variant="body2" sx={{ color: "var(--color-trading-down)", fontWeight: 600 }}>
        Erro: {message}
      </Typography>
    </Paper>
  );
}
