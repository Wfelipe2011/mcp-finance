import { useState } from "react";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 var(--space-md)",
        backgroundColor: "var(--color-canvas)",
      }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
          padding: "var(--space-lg)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-hairline)",
          backgroundColor: "var(--color-surface-card)",
        }}
      >
        <h2
          style={{
            fontWeight: 700,
            fontSize: "1.3rem",
            textAlign: "center",
            marginBottom: "var(--space-xs)",
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          💰 Finanças
        </h2>

        {error && (
          <div
            role="alert"
            style={{
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "color-mix(in srgb, var(--color-trading-down) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-trading-down) 40%, transparent)",
              color: "var(--color-trading-down)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="form-field">
          <label className="form-field-label">Email</label>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
          />
        </div>

        <div className="form-field">
          <label className="form-field-label">Senha</label>
          <input
            type="password"
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn w-full"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
            borderRadius: "var(--radius-md)",
            border: "none",
          }}
        >
          {loading ? <span className="loading loading-spinner loading-sm" /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}
