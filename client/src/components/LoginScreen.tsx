import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

interface Props {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login");
      } else if (data.token) {
        onLogin(data.token);
      }
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: "var(--space-md)",
        bgcolor: "var(--color-canvas)",
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
          p: "var(--space-lg)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          textAlign="center"
          mb={1}
          sx={{ color: "var(--color-text-primary)" }}
        >
          💰 Finanças
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          fullWidth
        />
        <TextField
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          fullWidth
          sx={{
            bgcolor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Entrar"}
        </Button>
      </Box>
    </Box>
  );
}
