import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createGoal,
  fetchBudgets,
  fetchFinancialDiagnosis,
  fetchDigest,
  fetchGoals,
  fetchTransacoes,
  postChatMessage,
  upsertBudget,
} from "../api/client.ts";
import type {
  BudgetExecution,
  ChatMessage,
  DiagnosisAction,
  DetailDestination,
  FinancialDiagnosis,
  Goal,
  Transacao,
} from "../api/types.ts";
import { AnomaliasList } from "../components/AnomaliasList.tsx";
import DailyInsightsNavigator from "../components/DailyInsightsNavigator.tsx";
import { Previsao } from "./Previsao.tsx";
import { formatBRL } from "../utils/format.ts";

const ANOMALY_THRESHOLD = 0.6;
const ANOMALIAS_INITIAL_LIMIT = 5;
const HORIZON_LABELS = ["Esta semana", "30 dias", "60 dias", "90 dias"];
const CAUSE_LABELS: Record<string, string> = {
  runway_critical: "Caixa imediato abaixo de 30 dias",
  structural_deficit: "Déficit operacional recorrente",
  high_debt: "Dívidas acima do limite saudável",
  elevated_debt: "Dívidas pressionando o orçamento",
  recurring_deficit: "Meses recorrentes no vermelho",
  discretionary_overspending: "Gastos discricionários acima da meta",
  insufficient_history: "Histórico financeiro ainda insuficiente",
  none: "Finanças em equilíbrio",
};

const EXECUTION_LINKS: { id: string; label: string; description: string }[] = [
  { id: "gastos", label: "Gastos", description: "Investigar categorias e transações" },
  { id: "credito", label: "Crédito", description: "Revisar cartões e parcelas" },
  { id: "metas", label: "Metas", description: "Acompanhar objetivos" },
  { id: "metas", label: "Orçamento", description: "Definir limites por categoria" },
  { id: "simulacao", label: "Simulação", description: "Testar decisões futuras" },
];

const PLAN_ORIGIN_TAG = "origem:plano";

type ActionConvertType = "goal" | "budget" | null;

function classifyAction(action: DiagnosisAction): ActionConvertType {
  if (action.destination === "metas") return "goal";
  if (action.destination === "orcamento") return "budget";
  return null;
}

function extractBudgetCategory(action: DiagnosisAction): string {
  const match = /\bem\s+([A-Za-zÀ-ú][A-Za-zÀ-ú\s]+)$/i.exec(action.title);
  if (match) return match[1].trim();
  return action.title;
}

function findSimilarActiveGoal(action: DiagnosisAction, goals: Goal[]): Goal | null {
  const words = action.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return (
    goals.find(
      (g) =>
        g.status === "active" &&
        words.some((w) => g.name.toLowerCase().includes(w))
    ) ?? null
  );
}

function findSimilarActiveBudget(
  action: DiagnosisAction,
  budgets: BudgetExecution[]
): BudgetExecution | null {
  const cat = extractBudgetCategory(action).toLowerCase();
  const firstWord = cat.split(/\s+/)[0];
  return budgets.find((b) => b.is_active && b.category_pt.toLowerCase().includes(firstWord)) ?? null;
}

function isPlanGoal(goal: Goal): boolean {
  return goal.notes?.includes(PLAN_ORIGIN_TAG) ?? false;
}

function resolveDestination(dest: DetailDestination): string {
  if (dest === "orcamento") return "metas";
  if (dest === "resumo") return "gastos";
  return dest;
}

function formatPrimaryCause(cause: string): string {
  return CAUSE_LABELS[cause] ?? cause;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    healthy: { label: "Saudável", color: "var(--color-trading-up)" },
    attention: { label: "Atenção", color: "#f59e0b" },
    urgent: { label: "Urgente", color: "var(--color-trading-down)" },
  };
  const { label, color } = config[status] ?? { label: status, color: "var(--color-text-body)" };
  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: "var(--radius-pill)",
        padding: "2px 10px",
        fontSize: "0.75rem",
        fontWeight: 700,
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: 0.9,
  fontWeight: 700,
  color: "var(--color-text-body)",
  margin: 0,
  marginBottom: "var(--space-sm)",
};

function GoalConfirmCard({
  action,
  goals,
  onNavigateTo,
  onConfirm,
  onCancel,
}: {
  action: DiagnosisAction;
  goals: Goal[];
  onNavigateTo: (id: string) => void;
  onConfirm: (goal: Goal) => void;
  onCancel: () => void;
}) {
  const similar = findSimilarActiveGoal(action, goals);
  const [name, setName] = useState(action.title);
  const [targetAmount, setTargetAmount] = useState(() =>
    action.estimated_monthly_impact > 0 ? Math.round(action.estimated_monthly_impact * 6) : 1000
  );
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    marginTop: "var(--space-sm)",
    padding: "var(--space-sm)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border-hairline)",
    backgroundColor: "var(--color-surface-elevated)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-xs)",
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 2,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border-hairline)",
    backgroundColor: "var(--color-surface-card)",
    color: "var(--color-text-primary)",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  if (similar) {
    return (
      <div style={panelStyle}>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-body)", lineHeight: 1.4 }}>
          Meta semelhante já existe:{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>{similar.name}</strong>{" "}
          ({Math.min(similar.progress_pct, 100).toFixed(0)}% concluída).
        </p>
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-hairline)", background: "transparent", cursor: "pointer", color: "var(--color-text-body)" }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => onNavigateTo("metas")}
            style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)", cursor: "pointer", fontWeight: 600 }}
          >
            Ver em Metas →
          </button>
        </div>
      </div>
    );
  }

  async function handleGoalConfirm() {
    if (!name.trim() || targetAmount <= 0) return;
    setSaving(true);
    setApiError(null);
    try {
      const goal = await createGoal({
        name: name.trim(),
        goal_type: "saving",
        target_amount: targetAmount,
        notes: `${PLAN_ORIGIN_TAG} | ${action.title}`,
      });
      onConfirm(goal);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao criar meta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
        Criar meta a partir desta recomendação
      </p>
      <label style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>
        Nome
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>
        Valor alvo (R$)
        <input
          type="number"
          min={1}
          step={10}
          value={targetAmount}
          onChange={(e) => setTargetAmount(Number(e.target.value))}
          style={inputStyle}
        />
      </label>
      {apiError && (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-trading-down)" }}>{apiError}</p>
      )}
      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-hairline)", background: "transparent", cursor: "pointer", color: "var(--color-text-body)" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleGoalConfirm()}
          disabled={saving || !name.trim() || targetAmount <= 0}
          style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)", cursor: "pointer", fontWeight: 600 }}
        >
          {saving ? "Criando..." : "Confirmar meta"}
        </button>
      </div>
    </div>
  );
}

function BudgetConfirmCard({
  action,
  budgets,
  onConfirm,
  onCancel,
}: {
  action: DiagnosisAction;
  budgets: BudgetExecution[];
  onConfirm: (budget: BudgetExecution) => void;
  onCancel: () => void;
}) {
  const similar = findSimilarActiveBudget(action, budgets);
  const suggestedCategory = extractBudgetCategory(action);
  const [category, setCategory] = useState(similar?.category_pt ?? suggestedCategory);
  const [limit, setLimit] = useState(() =>
    similar?.monthly_limit ??
    (action.estimated_monthly_impact > 0 ? Math.round(action.estimated_monthly_impact) : 500)
  );
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    marginTop: "var(--space-sm)",
    padding: "var(--space-sm)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border-hairline)",
    backgroundColor: "var(--color-surface-elevated)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-xs)",
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 2,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border-hairline)",
    backgroundColor: "var(--color-surface-card)",
    color: "var(--color-text-primary)",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  async function handleBudgetConfirm() {
    if (!category.trim() || limit <= 0) return;
    setSaving(true);
    setApiError(null);
    try {
      const budget = await upsertBudget({ category_pt: category.trim(), monthly_limit: limit });
      onConfirm(budget);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao salvar orçamento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
        {similar ? "Revisar orçamento existente" : "Definir orçamento a partir desta recomendação"}
      </p>
      {similar && (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-body)", lineHeight: 1.4 }}>
          Orçamento ativo para <strong>{similar.category_pt}</strong>: limite atual{" "}
          <strong>{formatBRL(similar.monthly_limit)}/mês</strong>. Ajuste abaixo se desejar alterar.
        </p>
      )}
      <label style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>
        Categoria
        <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>
        Teto mensal (R$)
        <input
          type="number"
          min={1}
          step={10}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={inputStyle}
        />
      </label>
      {apiError && (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-trading-down)" }}>{apiError}</p>
      )}
      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-hairline)", background: "transparent", cursor: "pointer", color: "var(--color-text-body)" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleBudgetConfirm()}
          disabled={saving || !category.trim() || limit <= 0}
          style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)", cursor: "pointer", fontWeight: 600 }}
        >
          {saving ? "Salvando..." : similar ? "Atualizar orçamento" : "Confirmar orçamento"}
        </button>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  goals,
  budgets,
  onNavigateTo,
  onGoalCreated,
  onBudgetCreated,
}: {
  action: DiagnosisAction;
  goals: Goal[];
  budgets: BudgetExecution[];
  onNavigateTo: (id: string) => void;
  onGoalCreated: (goal: Goal) => void;
  onBudgetCreated: (budget: BudgetExecution) => void;
}) {
  const [showConfirm, setShowConfirm] = useState<"goal" | "budget" | null>(null);
  const dest = resolveDestination(action.destination);
  const convertType = classifyAction(action);

  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        padding: "var(--space-md)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xs)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
        {action.title}
      </p>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-body)", lineHeight: 1.5 }}>
        {action.reason}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-xs)", flexWrap: "wrap", marginTop: "var(--space-xs)" }}>
        {action.estimated_monthly_impact > 0 ? (
          <span style={{ fontSize: "0.8rem", color: "var(--color-trading-up)", fontWeight: 600 }}>
            ↑ {formatBRL(action.estimated_monthly_impact)}/mês
          </span>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
          {convertType === "goal" && !showConfirm && (
            <button
              type="button"
              onClick={() => setShowConfirm("goal")}
              style={{
                fontSize: "0.8rem",
                padding: "4px var(--space-sm)",
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Criar meta
            </button>
          )}
          {convertType === "budget" && !showConfirm && (
            <button
              type="button"
              onClick={() => setShowConfirm("budget")}
              style={{
                fontSize: "0.8rem",
                padding: "4px var(--space-sm)",
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Definir orçamento
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateTo(dest)}
            style={{
              fontSize: "0.8rem",
              padding: "4px var(--space-sm)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-hairline)",
              backgroundColor: "var(--color-surface-elevated)",
              color: "var(--color-primary)",
              cursor: "pointer",
            }}
          >
            Ver detalhe →
          </button>
        </div>
      </div>
      {showConfirm === "goal" && (
        <GoalConfirmCard
          action={action}
          goals={goals}
          onNavigateTo={onNavigateTo}
          onConfirm={(goal) => {
            onGoalCreated(goal);
            setShowConfirm(null);
          }}
          onCancel={() => setShowConfirm(null)}
        />
      )}
      {showConfirm === "budget" && (
        <BudgetConfirmCard
          action={action}
          budgets={budgets}
          onConfirm={(budget) => {
            onBudgetCreated(budget);
            setShowConfirm(null);
          }}
          onCancel={() => setShowConfirm(null)}
        />
      )}
    </div>
  );
}

function EvidenceSection({ children, title }: { children: React.ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-sm) var(--space-md)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-primary)",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 var(--space-md) var(--space-md)",
            borderTop: "1px solid var(--color-border-hairline)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DegradedState({ onNavigateTo }: { onNavigateTo: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          backgroundColor: "var(--color-surface-card)",
          padding: "var(--space-md)",
        }}
      >
        <p style={{ margin: 0, color: "var(--color-text-body)", fontSize: "0.875rem" }}>
          O diagnóstico financeiro ainda não está disponível. Explore as ferramentas abaixo enquanto os dados são preparados.
        </p>
      </div>
      <ExecutionLinks onNavigateTo={onNavigateTo} />
    </div>
  );
}

function ExecutionLinks({ onNavigateTo }: { onNavigateTo: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-sm)" }}>
      {EXECUTION_LINKS.map((link) => (
        <button
          key={`${link.label}-${link.id}`}
          type="button"
          onClick={() => onNavigateTo(link.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px",
            padding: "var(--space-sm)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-hairline)",
            backgroundColor: "var(--color-surface-card)",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{link.label}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-body)" }}>{link.description}</span>
        </button>
      ))}
    </div>
  );
}

function ProgressSection({ goals, budgets, onNavigateTo }: { goals: Goal[]; budgets: BudgetExecution[]; onNavigateTo: (id: string) => void }) {
  const sortedActiveGoals = [...goals.filter((g) => g.status === "active")].sort((a, b) => {
    const ap = isPlanGoal(a) ? 0 : 1;
    const bp = isPlanGoal(b) ? 0 : 1;
    return ap - bp;
  });
  const activeGoals = sortedActiveGoals.slice(0, 2);
  const visibleBudgets = budgets.filter((budget) => budget.is_active).slice(0, 2);
  const hasProgress = activeGoals.length > 0 || visibleBudgets.length > 0;

  if (!hasProgress) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <p style={sectionHeadingStyle}>📌 Acompanhamento</p>
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-hairline)",
            backgroundColor: "var(--color-surface-card)",
            padding: "var(--space-md)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-sm)",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-body)", lineHeight: 1.5 }}>
            Transforme o plano em acompanhamento criando uma meta ou um orçamento por categoria.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTo("metas")}
            style={{
              padding: "6px var(--space-sm)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-hairline)",
              backgroundColor: "var(--color-surface-elevated)",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Criar acompanhamento →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <p style={sectionHeadingStyle}>📌 Acompanhamento</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-sm)" }}>
        {activeGoals.map((goal) => (
          <div key={`goal-${goal.id}`} style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-hairline)", backgroundColor: "var(--color-surface-card)", padding: "var(--space-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-xs)" }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted-strong)", fontWeight: 700 }}>Meta</p>
              {isPlanGoal(goal) && (
                <span style={{ fontSize: "0.65rem", color: "var(--color-primary)", fontWeight: 700, backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)", padding: "1px 6px", borderRadius: "var(--radius-pill)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
                  plano
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0", fontSize: "0.875rem", color: "var(--color-text-primary)", fontWeight: 600 }}>{goal.name}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-body)" }}>{Math.min(goal.progress_pct, 100).toFixed(0)}% concluída</p>
          </div>
        ))}
        {visibleBudgets.map((budget) => (
          <div key={`budget-${budget.id}`} style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-hairline)", backgroundColor: "var(--color-surface-card)", padding: "var(--space-md)" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted-strong)", fontWeight: 700 }}>Orçamento</p>
            <p style={{ margin: "2px 0", fontSize: "0.875rem", color: "var(--color-text-primary)", fontWeight: 600 }}>{budget.category_pt}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: budget.budget_status === "exceeded" ? "var(--color-trading-down)" : "var(--color-text-body)" }}>
              {formatBRL(budget.remaining)} restantes
            </p>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onNavigateTo("metas")} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--color-primary)", cursor: "pointer", padding: 0, fontSize: "0.8125rem", fontWeight: 600, textDecoration: "underline" }}>
        Ajustar metas e orçamentos →
      </button>
    </section>
  );
}

function DigestSummarySection() {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchDigest(currentMonth)
      .then((d) => { setNarrative(d?.narrative_pt ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentMonth]);

  if (loading) return <div className="loading loading-spinner loading-sm" style={{ margin: "var(--space-sm) 0" }} />;
  if (!narrative) return <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", margin: 0 }}>Análise mensal não disponível ainda.</p>;
  return <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", lineHeight: 1.6, margin: 0 }}>{narrative}</p>;
}

function AnomaliasSection() {
  const [anomalias, setAnomalias] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchTransacoes(currentMonth, 100)
      .then(({ items }) => {
        const filtered = items
          .filter((t) => (t.anomaly_score ?? 0) > ANOMALY_THRESHOLD)
          .sort((a, b) => (b.anomaly_score ?? 0) - (a.anomaly_score ?? 0));
        setAnomalias(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentMonth]);

  if (loading) return <div className="loading loading-spinner loading-sm" style={{ margin: "var(--space-sm) 0" }} />;
  const visible = showAll ? anomalias : anomalias.slice(0, ANOMALIAS_INITIAL_LIMIT);
  return (
    <div>
      <AnomaliasList transacoes={visible} />
      {!showAll && anomalias.length > ANOMALIAS_INITIAL_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: "var(--space-sm)",
            background: "transparent",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "4px var(--space-sm)",
            fontSize: "0.8rem",
            cursor: "pointer",
            color: "var(--color-text-primary)",
          }}
        >
          Ver mais ({anomalias.length - ANOMALIAS_INITIAL_LIMIT} restantes)
        </button>
      )}
    </div>
  );
}

const CHAT_WELCOME: ChatMessage = {
  role: "assistant",
  content: "Olá! Aqui você pode perguntar sobre seu plano financeiro, metas e próximos passos. Como posso te ajudar? 💬",
};

function PlanoChatPanel({ suggestedQuestions }: { suggestedQuestions: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([CHAT_WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const userMessage: ChatMessage = { role: "user", content: msg };
    const history = messages.filter((m) => m.content !== CHAT_WELCOME.content);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const response = await postChatMessage({ message: msg, history: history.slice(-10) });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Não consegui obter uma resposta agora. ${errMsg}. Tente novamente.` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <section
      style={{
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "var(--space-sm) var(--space-md)",
          borderBottom: "1px solid var(--color-border-hairline)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
        }}
      >
        <span aria-hidden>💬</span>
        <p style={{ margin: 0, fontWeight: 700, color: "var(--color-text-primary)" }}>Conversa sobre o plano</p>
      </div>

      {suggestedQuestions.length > 0 && (
        <div
          style={{
            padding: "var(--space-xs) var(--space-md)",
            borderBottom: "1px solid var(--color-border-hairline)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-xs)",
          }}
        >
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void handleSend(q)}
              disabled={loading}
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border-hairline)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-body)",
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
          padding: "var(--space-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xs)",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}
          >
            <div
              style={{
                maxWidth: "82%",
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: message.role === "user" ? "var(--color-primary)" : "var(--color-surface-elevated)",
                color: message.role === "user" ? "var(--color-on-primary)" : "var(--color-text-body)",
                border: message.role === "assistant" ? "1px solid var(--color-border-hairline)" : "none",
                whiteSpace: "pre-wrap",
                fontSize: "0.875rem",
                lineHeight: 1.45,
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-hairline)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-body)",
                fontSize: "0.875rem",
              }}
            >
              <span className="loading loading-spinner loading-sm" />
              Respondendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: "var(--space-sm)",
          borderTop: "1px solid var(--color-border-hairline)",
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--space-xs)",
        }}
      >
        <textarea
          className="textarea textarea-bordered"
          rows={1}
          placeholder="Pergunte sobre seu plano..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            resize: "none",
            minHeight: 42,
            backgroundColor: "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
            borderColor: "var(--color-border-hairline)",
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Enviar mensagem"
          style={{
            minHeight: 42,
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          ➤
        </button>
      </div>
    </section>
  );
}

function buildSuggestedQuestions(actions: DiagnosisAction[]): string[] {
  const fromActions = actions.slice(0, 2).map((a) => `Como posso ${a.title.toLowerCase()}?`);
  const base = [
    "Qual é minha principal causa de déficit?",
    "Como melhorar meu saldo nos próximos 30 dias?",
  ];
  return [...fromActions, ...base].slice(0, 4);
}

export function Plano({ onNavigateTo }: { onNavigateTo: (id: string) => void }) {
  const [diagnosis, setDiagnosis] = useState<FinancialDiagnosis | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<BudgetExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchFinancialDiagnosis()
      .then((d) => { setDiagnosis(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    fetchGoals().then(setGoals).catch(() => setGoals([]));
    fetchBudgets().then(setBudgets).catch(() => setBudgets([]));
  }, []);

  const handleGoalCreated = useCallback((goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
  }, []);

  const handleBudgetCreated = useCallback((budget: BudgetExecution) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === budget.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = budget;
        return next;
      }
      return [...prev, budget];
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-md)", display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  const actions = diagnosis?.recommended_actions ?? [];
  const suggestedQuestions = buildSuggestedQuestions(actions);

  const horizonGroups: { label: string; actions: DiagnosisAction[] }[] = HORIZON_LABELS.map((label) => ({
    label,
    actions: [],
  }));
  actions.forEach((action, i) => {
    horizonGroups[Math.min(i, HORIZON_LABELS.length - 1)].actions.push(action);
  });
  const activeHorizons = horizonGroups.filter((g) => g.actions.length > 0);

  return (
    <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-primary)", margin: 0 }}>
          Plano Financeiro
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-body)", margin: "var(--space-xs) 0 0" }}>
          Diagnóstico, ações recomendadas e acompanhamento.
        </p>
      </div>

      {(error || !diagnosis) && <DegradedState onNavigateTo={onNavigateTo} />}

      {diagnosis && (
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-hairline)",
            backgroundColor: "var(--color-surface-card)",
            padding: "var(--space-md)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <StatusBadge status={diagnosis.status} />
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
              Resumo Executivo
            </p>
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-body)", lineHeight: 1.5 }}>
            <strong>Causa principal:</strong> {formatPrimaryCause(diagnosis.primary_cause)}
          </p>
          {diagnosis.alerts
            .filter((a) => a.severity === "high")
            .slice(0, 2)
            .map((alert) => (
              <p key={alert.code} style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-trading-down)" }}>
                ⚠ {alert.message}
              </p>
            ))}
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-body)" }}>
            Saldo médio mensal:{" "}
            <strong
              style={{
                color:
                  diagnosis.metrics.avg_monthly_balance < 0
                    ? "var(--color-trading-down)"
                    : "var(--color-trading-up)",
              }}
            >
              {formatBRL(diagnosis.metrics.avg_monthly_balance)}
            </strong>
          </p>
        </div>
      )}

      {diagnosis && activeHorizons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <p style={sectionHeadingStyle}>📋 Ações recomendadas</p>
          {activeHorizons.map((group) => (
            <div key={group.label}>
              <p style={{ ...sectionHeadingStyle, marginBottom: "var(--space-xs)" }}>{group.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {group.actions.map((action) => (
                  <ActionCard
                    key={action.title}
                    action={action}
                    goals={goals}
                    budgets={budgets}
                    onNavigateTo={onNavigateTo}
                    onGoalCreated={handleGoalCreated}
                    onBudgetCreated={handleBudgetCreated}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {diagnosis && activeHorizons.length === 0 && (
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-hairline)",
            backgroundColor: "var(--color-surface-card)",
            padding: "var(--space-md)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-trading-up)" }}>
            ✓ Nenhuma ação prioritária identificada no momento.
          </p>
        </div>
      )}

      <ProgressSection goals={goals} budgets={budgets} onNavigateTo={onNavigateTo} />

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <p style={sectionHeadingStyle}>🧭 Executar no detalhe</p>
        <ExecutionLinks onNavigateTo={onNavigateTo} />
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <p style={sectionHeadingStyle}>📊 Evidências</p>
        <EvidenceSection title="✨ Análise do Mês">
          <div style={{ paddingTop: "var(--space-sm)" }}>
            <DailyInsightsNavigator />
          </div>
        </EvidenceSection>
        <EvidenceSection title="📋 Resumo Mensal">
          <div style={{ paddingTop: "var(--space-sm)" }}>
            <DigestSummarySection />
          </div>
        </EvidenceSection>
        <EvidenceSection title="⚠️ Anomalias">
          <div style={{ paddingTop: "var(--space-sm)" }}>
            <AnomaliasSection />
          </div>
        </EvidenceSection>
        <EvidenceSection title="📅 Previsões">
          <div style={{ paddingTop: "var(--space-sm)" }}>
            <Previsao />
          </div>
        </EvidenceSection>
      </div>

      <PlanoChatPanel suggestedQuestions={suggestedQuestions} />
    </div>
  );
}
