import type { DetailDestination, DiagnosisStatus, FinancialDiagnosis, InsightToday } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const STATUS_CONFIG: Record<DiagnosisStatus, {
  icon: string;
  label: string;
  borderColor: string;
  bgColor: string;
  labelColor: string;
}> = {
  urgent: {
    icon: "🚨",
    label: "Atenção urgente",
    borderColor: "color-mix(in srgb, var(--color-trading-down) 55%, var(--color-border-hairline))",
    bgColor: "color-mix(in srgb, var(--color-trading-down) 10%, var(--color-surface-card))",
    labelColor: "var(--color-trading-down)",
  },
  attention: {
    icon: "⚠️",
    label: "Ponto de atenção",
    borderColor: "color-mix(in srgb, #f59e0b 55%, var(--color-border-hairline))",
    bgColor: "color-mix(in srgb, #f59e0b 10%, var(--color-surface-card))",
    labelColor: "#b45309",
  },
  healthy: {
    icon: "✅",
    label: "Finanças saudáveis",
    borderColor: "color-mix(in srgb, var(--color-trading-up) 45%, var(--color-border-hairline))",
    bgColor: "color-mix(in srgb, var(--color-trading-up) 8%, var(--color-surface-card))",
    labelColor: "var(--color-trading-up)",
  },
};

const CAUSE_LABELS: Record<string, string> = {
  runway_critical: "Caixa imediato abaixo de 30 dias",
  structural_deficit: "Déficit operacional recorrente",
  high_debt: "Dívidas acima do limite saudável",
  elevated_debt: "Dívidas pressionando o orçamento",
  recurring_deficit: "Meses recorrentes no vermelho",
  discretionary_overspending: "Gastos discricionários acima da meta",
  none: "Finanças em equilíbrio",
};

function destinationToScreen(dest: DetailDestination): string {
  switch (dest) {
    case "gastos": return "gastos";
    case "credito": return "credito";
    case "metas": return "metas";
    case "orcamento": return "gastos";
    case "resumo": return "hoje";
    default: return "plano";
  }
}

function formatPrimaryCause(cause: string): string {
  return CAUSE_LABELS[cause] ?? cause;
}

interface Props {
  diagnosis: FinancialDiagnosis | null;
  insight: InsightToday | null;
  onNavigateTo: (id: string) => void;
  diagnosisUnavailable?: boolean;
}

export function FinancialPriorityCard({ diagnosis, insight, onNavigateTo, diagnosisUnavailable }: Props) {
  if (diagnosis) {
    const config = STATUS_CONFIG[diagnosis.status];
    const primaryAction = diagnosis.recommended_actions[0] ?? null;
    const runway = diagnosis.metrics.runway_imediato_meses;
    const primaryScreen = diagnosis.status === "healthy"
      ? "plano"
      : primaryAction?.destination
        ? destinationToScreen(primaryAction.destination)
        : "plano";

    return (
      <div
        role="region"
        aria-label="Prioridade financeira"
        data-testid="financial-priority-card"
        data-status={diagnosis.status}
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md)",
          border: `1px solid ${config.borderColor}`,
          backgroundColor: config.bgColor,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-xs)" }}>
          <span aria-hidden style={{ fontSize: 18 }}>{config.icon}</span>
          <p style={{
            margin: 0,
            fontSize: "0.75rem",
            textTransform: "uppercase" as const,
            letterSpacing: 0.9,
            fontWeight: 700,
            color: config.labelColor,
          }}>
            {config.label}
          </p>
        </div>

        <p style={{
          margin: 0,
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-xs)",
          lineHeight: 1.4,
        }}>
          {formatPrimaryCause(diagnosis.primary_cause)}
        </p>

        {runway != null && (
          <p style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: "var(--color-muted-strong)",
            marginBottom: "var(--space-sm)",
          }}>
            Runway:{" "}
            <strong>
              {runway < 1 ? "menos de 1 mês" : `${runway.toFixed(1)} meses`}
            </strong>
          </p>
        )}

        {primaryAction && (
          <div style={{
            padding: "var(--space-sm)",
            borderRadius: "var(--radius-md, var(--radius-lg))",
            backgroundColor: "var(--color-surface-card)",
            border: "1px solid var(--color-border-hairline)",
            marginBottom: "var(--space-sm)",
          }}>
            <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
              Ação recomendada
            </p>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-body)", lineHeight: 1.5 }}>
              {primaryAction.title}
              {primaryAction.estimated_monthly_impact > 0 && (
                <span style={{ color: "var(--color-trading-up)", fontWeight: 600 }}>
                  {" "}· economizar {formatBRL(primaryAction.estimated_monthly_impact)}/mês
                </span>
              )}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onNavigateTo(primaryScreen);
          }}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: config.labelColor,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          {diagnosis.status === "healthy" ? "Ver plano →" : "Ver diagnóstico completo →"}
        </button>
      </div>
    );
  }

  // Fallback: insight antigo
  if (insight?.type != null && insight.text) {
    const isAnomaly = insight.type === "anomaly";
    return (
      <div
        role="region"
        aria-label="Insight do dia"
        data-testid="financial-priority-card"
        data-status="fallback-insight"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md)",
          border: isAnomaly
            ? "1px solid color-mix(in srgb, var(--color-trading-down) 45%, var(--color-border-hairline))"
            : "1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border-hairline))",
          backgroundColor: isAnomaly
            ? "color-mix(in srgb, var(--color-trading-down) 8%, var(--color-surface-card))"
            : "color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-card))",
        }}
      >
        {diagnosisUnavailable && (
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--color-muted)", marginBottom: "var(--space-xs)" }}>
            Diagnóstico indisponível no momento
          </p>
        )}
        <p style={{
          margin: 0,
          fontSize: "0.75rem",
          textTransform: "uppercase" as const,
          letterSpacing: 0.9,
          fontWeight: 700,
          color: isAnomaly ? "var(--color-trading-down)" : "var(--color-primary)",
          marginBottom: "var(--space-xs)",
        }}>
          {isAnomaly ? "⚠️ Anomalia detectada" : "⭐ Insight do dia"}
        </p>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-body)", lineHeight: 1.55, marginBottom: "var(--space-sm)" }}>
          {insight.text}
        </p>
        <button
          type="button"
          onClick={() => onNavigateTo("ia")}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Ver detalhes →
        </button>
      </div>
    );
  }

  // Sem dados: mostrar mensagem discreta apenas quando houve falha de diagnóstico
  if (diagnosisUnavailable) {
    return (
      <div
        data-testid="financial-priority-card"
        data-status="unavailable"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-sm) var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          backgroundColor: "var(--color-surface-card)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-muted)" }}>
          Diagnóstico financeiro indisponível no momento.
        </p>
      </div>
    );
  }

  return null;
}
