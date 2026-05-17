import type { SemanticTone } from "../utils/semanticTone.ts";

const FLAG_LABELS: Record<string, { label: string; tone: SemanticTone }> = {
  cashflow_negativo: { label: "Cashflow negativo", tone: "negative" },
  dependencia_de_divida: { label: "Dependência de dívida", tone: "negative" },
  emprestimo_detectado: { label: "Empréstimo detectado", tone: "warning" },
  gastos_atipicos: { label: "Gastos atípicos", tone: "warning" },
  gastos_elevados: { label: "Gastos elevados", tone: "warning" },
  receita_variavel: { label: "Receita variável", tone: "neutral" },
  investimento_detectado: { label: "Investimento detectado", tone: "neutral" },
  sem_anomalias: { label: "Sem anomalias", tone: "positive" },
};

export function FlagPills({ flags }: { flags: string[] | null | undefined }) {
  if (!flags || flags.length === 0) return null;

  const toneStyles: Record<SemanticTone, { color: string; borderColor: string; backgroundColor: string }> = {
    positive: {
      color: "var(--color-trading-up)",
      borderColor: "color-mix(in srgb, var(--color-trading-up) 50%, var(--color-border-hairline))",
      backgroundColor: "color-mix(in srgb, var(--color-trading-up) 16%, transparent)",
    },
    negative: {
      color: "var(--color-trading-down)",
      borderColor: "color-mix(in srgb, var(--color-trading-down) 50%, var(--color-border-hairline))",
      backgroundColor: "color-mix(in srgb, var(--color-trading-down) 16%, transparent)",
    },
    warning: {
      color: "var(--color-primary)",
      borderColor: "color-mix(in srgb, var(--color-primary) 50%, var(--color-border-hairline))",
      backgroundColor: "color-mix(in srgb, var(--color-primary) 16%, transparent)",
    },
    neutral: {
      color: "var(--color-text-body)",
      borderColor: "var(--color-border-hairline)",
      backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 68%, transparent)",
    },
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {flags.map((flag) => {
        const info = FLAG_LABELS[flag] ?? { label: flag, tone: "neutral" as SemanticTone };
        const style = toneStyles[info.tone];
        return (
          <span
            key={flag}
            data-testid="flag-pill"
            style={{
              color: style.color,
              borderColor: style.borderColor,
              backgroundColor: style.backgroundColor,
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "var(--radius-pill)",
              padding: "2px var(--space-sm)",
              fontSize: "0.75rem",
              fontWeight: 600,
              lineHeight: 1.35,
            }}
          >
            {info.label}
          </span>
        );
      })}
    </div>
  );
}
