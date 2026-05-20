import type { FinancialDiagnosis } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

interface Props {
  diagnosis: FinancialDiagnosis | null;
  onNavigateTo: (id: string) => void;
}

interface SummaryCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  target: string;
  highlighted: boolean;
}

export function TodaySummaryCards({ diagnosis, onNavigateTo }: Props) {
  const isProblematic = diagnosis?.status === "urgent" || diagnosis?.status === "attention";
  const primaryAction = diagnosis?.recommended_actions[0] ?? null;
  const installmentCommitment = diagnosis?.metrics.installment_commitment_total;

  const cards: SummaryCard[] = [
    {
      id: "gastos",
      icon: "🧾",
      title: "Gastos",
      description: isProblematic
        ? "Há categorias críticas para revisar."
        : "Veja o detalhamento por categoria.",
      ctaLabel: "Ver gastos",
      target: "gastos",
      highlighted: isProblematic,
    },
    {
      id: "credito",
      icon: "💳",
      title: "Crédito",
      description: installmentCommitment != null && installmentCommitment > 0
        ? `Parcelas futuras: ${formatBRL(installmentCommitment)}.`
        : "Acompanhe cartões e parcelas.",
      ctaLabel: "Ver crédito",
      target: "credito",
      highlighted: false,
    },
    {
      id: "futuro",
      icon: "📅",
      title: "Próximos meses",
      description: "Projeções de caixa e compromissos futuros.",
      ctaLabel: "Ver projeções",
      target: "proximo-mes",
      highlighted: false,
    },
    {
      id: "metas",
      icon: "🎯",
      title: "Metas e reserva",
      description: "Acompanhe suas metas e reserva de emergência.",
      ctaLabel: "Ver metas",
      target: "metas",
      highlighted: false,
    },
    {
      id: "simulacao",
      icon: "🔮",
      title: "Simulação",
      description: "Simule cenários de corte ou investimento.",
      ctaLabel: "Simular",
      target: "simulacao",
      highlighted: false,
    },
  ];

  const cardBase = {
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-md)",
    border: "1px solid var(--color-border-hairline)",
    backgroundColor: "var(--color-surface-card)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-xs)",
  };

  const cardHighlighted = {
    ...cardBase,
    border: "1px solid color-mix(in srgb, var(--color-trading-down) 45%, var(--color-border-hairline))",
    backgroundColor: "color-mix(in srgb, var(--color-trading-down) 6%, var(--color-surface-card))",
  };

  const ctaStyle = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--color-primary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textAlign: "left" as const,
    textDecoration: "underline",
    marginTop: "auto",
  };

  return (
    <div data-testid="today-summary-cards">
      <p style={{
        fontSize: "0.75rem",
        textTransform: "uppercase" as const,
        letterSpacing: 0.9,
        fontWeight: 600,
        color: "var(--color-muted-strong)",
        marginBottom: "var(--space-sm)",
        marginTop: 0,
      }}>
        Detalhar
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.id} style={card.highlighted ? cardHighlighted : cardBase}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
              <span aria-hidden style={{ fontSize: 16 }}>{card.icon}</span>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {card.title}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
              {card.description}
            </p>
            <button type="button" onClick={() => onNavigateTo(card.target)} style={ctaStyle}>
              {card.ctaLabel} →
            </button>
          </div>
        ))}

        <div style={cardBase}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <span aria-hidden style={{ fontSize: 16 }}>🗺️</span>
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
              Plano
            </p>
          </div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
            {primaryAction && primaryAction.estimated_monthly_impact > 0
              ? `Corte sugerido: ${formatBRL(primaryAction.estimated_monthly_impact)}/mês`
              : primaryAction
                ? primaryAction.title
              : "Revise seu diagnóstico e defina um plano."}
          </p>
          <button type="button" onClick={() => onNavigateTo("plano")} style={ctaStyle}>
            {primaryAction ? "Ver plano →" : "Revisar diagnóstico →"}
          </button>
        </div>
      </div>
    </div>
  );
}
