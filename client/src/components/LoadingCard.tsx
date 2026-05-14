import { CircularProgress, Paper, Typography } from "@mui/material";

export function LoadingCard({ title = "Carregando..." }: { title?: string }) {
  return (
    <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <CircularProgress size={20} />
      <Typography variant="body2" color="text.secondary">{title}</Typography>
    </Paper>
  );
}
