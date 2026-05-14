import { Paper, Typography } from "@mui/material";

export function ErrorCard({ message }: { message: string }) {
  return (
    <Paper elevation={1} sx={{ borderRadius: 2, p: 2, mt: 2, borderLeft: "4px solid", borderColor: "error.main" }}>
      <Typography variant="body2" color="error">Erro: {message}</Typography>
    </Paper>
  );
}
