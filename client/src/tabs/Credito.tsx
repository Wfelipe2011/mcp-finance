import { useState, useEffect } from "react";
import { fetchCompromissosCartoes, fetchParcelasTimeline } from "../api/client.ts";
import type { CartaoResumo, ParcelaTimeline } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { CartaoCard } from "../components/CartaoCard.tsx";
import { ParcelasTimelineChart } from "../components/ParcelasTimelineChart.tsx";
import { formatBRL } from "../utils/format.ts";

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};

export function Credito() {
  const [cartoes, setCartoes] = useState<CartaoResumo[]>([]);
  const [timeline, setTimeline] = useState<ParcelaTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchCompromissosCartoes(), fetchParcelasTimeline()])
      .then(([c, t]) => {
        setCartoes(c);
        setTimeline(t);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados de crédito");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Crédito..." />;
  if (error) return <ErrorCard message={error} />;

  const totalDevedor = cartoes.reduce((sum, c) => sum + c.total_comprometido, 0);

  return (
    <div className="space-y-4" style={{ paddingTop: "var(--space-sm)" }}>
      {/* Card de saldo devedor total */}
      <div style={cardStyle}>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-muted)",
            fontWeight: 500,
          }}
        >
          Saldo devedor total
        </p>
        {cartoes.length === 0 ? (
          <p style={{ margin: "var(--space-xs) 0 0", color: "var(--color-muted)", fontStyle: "italic", fontSize: "0.875rem" }}>
            Nenhum compromisso em aberto.
          </p>
        ) : (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {formatBRL(totalDevedor)}
          </p>
        )}
      </div>

      {/* Lista de cartões */}
      {cartoes.length > 0 && (
        <div>
          <p
            style={{
              margin: "0 0 var(--space-xs)",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Por cartão
          </p>
          <div className="space-y-2">
            {cartoes.map((c) => (
              <CartaoCard key={c.account_id} cartao={c} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline de parcelas */}
      <div style={cardStyle}>
        <p
          style={{
            margin: "0 0 var(--space-sm)",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--color-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Parcelas futuras (próx. 24 meses)
        </p>
        {timeline.length === 0 ? (
          <p style={{ margin: 0, color: "var(--color-muted)", fontStyle: "italic", fontSize: "0.875rem" }}>
            Nenhuma parcela futura.
          </p>
        ) : (
          <ParcelasTimelineChart data={timeline} />
        )}
      </div>
    </div>
  );
}
