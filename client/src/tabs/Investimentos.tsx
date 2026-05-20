import { useState, useEffect } from "react";
import { fetchPatrimonio, fetchInvestimentos } from "../api/client.ts";
import type { Patrimonio, InvestimentoMensal } from "../api/types.ts";
import { LoadingCard } from "../components/LoadingCard.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { PatrimonioDonut } from "../components/PatrimonioDonut.tsx";
import { InvestimentosBarChart } from "../components/InvestimentosBarChart.tsx";
import { formatBRL } from "../utils/format.ts";

const cardStyle = {
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-md)",
  border: "1px solid var(--color-border-hairline)",
  backgroundColor: "var(--color-surface-card)",
};

export function Investimentos({ month: _month }: { month: string }) {
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [investimentos, setInvestimentos] = useState<InvestimentoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchPatrimonio(), fetchInvestimentos(6)])
      .then(([pt, inv]) => {
        setPatrimonio(pt);
        setInvestimentos(inv);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar investimentos");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingCard title="Carregando Investimentos..." />;
  if (error) return <ErrorCard message={error} />;

  return (
    <div className="mt-4 space-y-4">
      <div style={cardStyle}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600, color: "var(--color-text-body)", margin: 0 }}>
          Patrimônio Total
        </p>
        <p
          data-testid="investimentos-patrimonio-total"
          style={{
            fontWeight: 700,
            marginTop: "var(--space-xs)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-family-numeric)",
            fontSize: "2.5rem",
            lineHeight: 1.1,
          }}
        >
          {formatBRL(patrimonio?.total_patrimonio ?? 0)}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "var(--space-xxs)", marginBottom: "var(--space-sm)" }}>
          Distribuição consolidada por tipo de conta.
        </p>
        {patrimonio && <PatrimonioDonut contas={patrimonio.items} />}
      </div>

      <div style={cardStyle}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, color: "var(--color-muted-strong)", margin: 0 }}>
          Movimentações (últimos 6 meses)
        </p>
        <div style={{ marginTop: "var(--space-xs)" }}>
          <InvestimentosBarChart data={investimentos} />
        </div>
      </div>
    </div>
  );
}
