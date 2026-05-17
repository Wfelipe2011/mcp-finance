import { CircularProgress, Paper, Typography } from "@mui/material";

export function LoadingCard({ title = "Carregando..." }: { title?: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mt: "var(--space-sm)",
        px: "var(--space-md)",
        py: "var(--space-sm)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "var(--color-surface-card)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <CircularProgress size={20} />
      <Typography variant="body2" sx={{ color: "var(--color-text-body)", fontWeight: 500 }}>
        {title}
      </Typography>
    </Paper>
  );
}
