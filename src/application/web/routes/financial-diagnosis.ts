import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

// ── versão da regra ────────────────────────────────────────────────────────
export const RULE_VERSION = "1.0.0";

// ── tipos públicos ─────────────────────────────────────────────────────────
export type DiagnosisStatus = "healthy" | "attention" | "urgent";
export type DetailDestination = "gastos" | "credito" | "metas" | "orcamento" | "resumo";
export type BucketKey = "needs" | "wants" | "debt_goals" | "other";

export interface DiagnosisBucket {
  key: BucketKey;
  label: string;
  monthly_amount: number;
  income_ratio: number;
  target_ratio: number;
  target_delta: number;
}

export interface DiagnosisAlert {
  code: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface DiagnosisAction {
  title: string;
  reason: string;
  estimated_monthly_impact: number;
  destination: DetailDestination;
}

export interface DiagnosisMetrics {
  operational_income: number;
  loan_inflows: number;
  avg_monthly_income: number;
  avg_monthly_income_operational: number;
  avg_monthly_expenses: number;
  avg_monthly_balance: number;
  avg_monthly_loan_inflows: number;
  negative_months: number;
  negative_months_without_loans: number;
  total_months_analyzed: number;
  runway_imediato_meses: number | null;
  runway_total_meses: number | null;
  debt_ratio: number;
  installment_commitment_total: number;
  outlier_expense_count: number;
  outlier_expense_total: number;
}

export interface FinancialDiagnosis {
  status: DiagnosisStatus;
  primary_cause: string;
  metrics: DiagnosisMetrics;
  buckets: DiagnosisBucket[];
  alerts: DiagnosisAlert[];
  recommended_actions: DiagnosisAction[];
  detail_links: Record<DetailDestination, string>;
  rule_version: string;
}

// ── tipos internos (entrada do motor de regras) ────────────────────────────
export interface DiagnosisCashflowMonth {
  year: number;
  month: number;
  total_receitas: number;
  total_despesas: number;
  saldo_liquido: number;
  total_emprestimos: number;
  total_receitas_operacionais: number;
}

export interface DiagnosisSpendingGroup {
  group_pt: string;
  total_gastos: number;
}

export interface DiagnosisOutlierExpense {
  description: string;
  category_pt: string;
  group_pt: string;
  amount: number;
  date_day: string;
}

export interface DiagnosisRunway {
  runway_imediato_meses: number | null;
  runway_total_meses: number | null;
}

export interface DiagnosisRawData {
  cashflowMonths: DiagnosisCashflowMonth[];
  runway: DiagnosisRunway | null;
  spendingByGroup: DiagnosisSpendingGroup[];
  installmentCommitmentTotal: number;
  outlierExpenses: DiagnosisOutlierExpense[];
}

// ── mapeamento de grupos para buckets ──────────────────────────────────────
const NEEDS_GROUPS = new Set([
  "Moradia",
  "Mercado e Supermercado",
  "Serviços",
  "Transporte",
  "Saúde",
  "Obrigações Legais",
  "Seguros",
  "Tarifas Bancárias",
  "Impostos",
]);

const WANTS_GROUPS = new Set([
  "Compras",
  "Alimentação",
  "Serviços Digitais",
  "Viagem",
  "Doações",
]);

const DEBT_GROUPS = new Set([
  "Empréstimos e Financiamentos",
]);

function classifyGroup(group: string): BucketKey {
  if (NEEDS_GROUPS.has(group)) return "needs";
  if (WANTS_GROUPS.has(group)) return "wants";
  if (DEBT_GROUPS.has(group)) return "debt_goals";
  return "other";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── motor de regras determinístico (função pura, testável) ─────────────────
export function computeDiagnosis(data: DiagnosisRawData): FinancialDiagnosis {
  const { cashflowMonths, runway, spendingByGroup, installmentCommitmentTotal, outlierExpenses } = data;
  const n = cashflowMonths.length;

  // métricas de cashflow
  const operationalIncome = cashflowMonths.reduce((s, m) => s + m.total_receitas_operacionais, 0);
  const loanInflows = cashflowMonths.reduce((s, m) => s + m.total_emprestimos, 0);
  const outlierExpenseTotal = outlierExpenses.reduce((s, expense) => s + expense.amount, 0);
  const avgIncome = n > 0
    ? cashflowMonths.reduce((s, m) => s + m.total_receitas, 0) / n : 0;
  const avgIncomeOp = n > 0
    ? operationalIncome / n : 0;
  const avgExpenses = n > 0
    ? cashflowMonths.reduce((s, m) => s + m.total_despesas, 0) / n : 0;
  const avgBalance = n > 0
    ? cashflowMonths.reduce((s, m) => s + m.saldo_liquido, 0) / n : 0;
  const avgLoans = n > 0
    ? loanInflows / n : 0;

  const negativeMths = cashflowMonths.filter(m => m.saldo_liquido < 0).length;
  const negativeMthsNoLoans = cashflowMonths.filter(
    m => (m.total_receitas_operacionais - m.total_despesas) < 0
  ).length;

  // totais por bucket (12 meses acumulados)
  const bucketTotals: Record<BucketKey, number> = {
    needs: 0, wants: 0, debt_goals: 0, other: 0,
  };
  for (const g of spendingByGroup) {
    bucketTotals[classifyGroup(g.group_pt)] += g.total_gastos;
  }

  const totalSpending12m = bucketTotals.needs + bucketTotals.wants
    + bucketTotals.debt_goals + bucketTotals.other;
  const debtRatio = totalSpending12m > 0
    ? bucketTotals.debt_goals / totalSpending12m : 0;

  // runway
  const runwayImediato = runway?.runway_imediato_meses ?? null;
  const runwayTotal = runway?.runway_total_meses ?? null;

  const metrics: DiagnosisMetrics = {
    operational_income: round2(operationalIncome),
    loan_inflows: round2(loanInflows),
    avg_monthly_income: round2(avgIncome),
    avg_monthly_income_operational: round2(avgIncomeOp),
    avg_monthly_expenses: round2(avgExpenses),
    avg_monthly_balance: round2(avgBalance),
    avg_monthly_loan_inflows: round2(avgLoans),
    negative_months: negativeMths,
    negative_months_without_loans: negativeMthsNoLoans,
    total_months_analyzed: n,
    runway_imediato_meses: runwayImediato,
    runway_total_meses: runwayTotal,
    debt_ratio: round2(debtRatio),
    installment_commitment_total: round2(installmentCommitmentTotal),
    outlier_expense_count: outlierExpenses.length,
    outlier_expense_total: round2(outlierExpenseTotal),
  };

  // buckets 50/30/20 (base = renda operacional média; fallback para renda total)
  const baseIncome = avgIncomeOp > 0 ? avgIncomeOp : avgIncome;
  const TARGET_RATIOS: Record<BucketKey, number> = {
    needs: 0.50, wants: 0.30, debt_goals: 0.20, other: 0,
  };
  const BUCKET_LABELS: Record<BucketKey, string> = {
    needs: "Essenciais",
    wants: "Discricionários",
    debt_goals: "Dívidas e Compromissos",
    other: "Outros",
  };
  const monthsDivisor = n > 0 ? n : 12;
  const insufficientHistory = n < 3 || totalSpending12m <= 0;
  const buckets: DiagnosisBucket[] = insufficientHistory ? [] : (
    ["needs", "wants", "debt_goals", "other"] as BucketKey[]
  ).map(key => {
    const monthly = bucketTotals[key] / monthsDivisor;
    const incomeRatio = baseIncome > 0 ? monthly / baseIncome : 0;
    const targetRatio = TARGET_RATIOS[key];
    return {
      key,
      label: BUCKET_LABELS[key],
      monthly_amount: round2(monthly),
      income_ratio: round2(incomeRatio),
      target_ratio: targetRatio,
      target_delta: round2(incomeRatio - targetRatio),
    };
  });

  // alertas
  const alerts: DiagnosisAlert[] = [];

  if (runwayImediato !== null && runwayImediato * 30 < 30) {
    alerts.push({
      code: "runway_critical",
      severity: "high",
      message: `Runway imediato crítico: ${round2(runwayImediato * 30)} dias de caixa.`,
    });
  } else if (runwayImediato !== null && runwayImediato < 3) {
    alerts.push({
      code: "runway_low",
      severity: "medium",
      message: `Runway imediato baixo: ${round2(runwayImediato)} meses.`,
    });
  }

  if (negativeMthsNoLoans >= 3) {
    alerts.push({
      code: "structural_deficit",
      severity: negativeMthsNoLoans >= 6 ? "high" : "medium",
      message: `${negativeMthsNoLoans} de ${n} meses no déficit operacional (sem empréstimos).`,
    });
  }

  if (debtRatio > 0.20) {
    alerts.push({
      code: "high_debt_ratio",
      severity: debtRatio > 0.30 ? "high" : "medium",
      message: `Dívidas representam ${(debtRatio * 100).toFixed(0)}% das saídas.`,
    });
  }

  const wantsBucket = buckets.find(b => b.key === "wants");
  if (wantsBucket && wantsBucket.income_ratio > 0.30) {
    alerts.push({
      code: "discretionary_high",
      severity: "low",
      message: `Gastos discricionários em ${(wantsBucket.income_ratio * 100).toFixed(0)}% da renda (meta: 30%).`,
    });
  }

  if (outlierExpenses.length > 0) {
    alerts.push({
      code: "expense_outliers",
      severity: "low",
      message: `${outlierExpenses.length} gasto(s) atípico(s) no período analisado.`,
    });
  }

  if (insufficientHistory) {
    alerts.push({
      code: "insufficient_history",
      severity: "low",
      message: "Histórico insuficiente (menos de 3 meses). Diagnóstico pode ser impreciso.",
    });
  }

  // status (prioridade determinística)
  let status: DiagnosisStatus = "healthy";
  if (
    (runwayImediato !== null && runwayImediato * 30 < 30) ||
    negativeMthsNoLoans >= 9
  ) {
    status = "urgent";
  } else if (
    negativeMthsNoLoans >= 3 ||
    debtRatio > 0.20 ||
    (runwayImediato !== null && runwayImediato < 3) ||
    (wantsBucket !== undefined && wantsBucket.income_ratio > 0.30)
  ) {
    status = "attention";
  }

  // causa principal (primeira condição verdadeira vence)
  let primaryCause: string;
  if (runwayImediato !== null && runwayImediato * 30 < 30) {
    primaryCause = "runway_critical";
  } else if (negativeMthsNoLoans >= 6) {
    primaryCause = "structural_deficit";
  } else if (debtRatio > 0.30) {
    primaryCause = "high_debt";
  } else if (debtRatio > 0.20) {
    primaryCause = "elevated_debt";
  } else if (negativeMthsNoLoans >= 3) {
    primaryCause = "recurring_deficit";
  } else if (wantsBucket && wantsBucket.income_ratio > 0.30) {
    primaryCause = "discretionary_overspending";
  } else {
    primaryCause = "none";
  }

  // ações recomendadas
  const actions: DiagnosisAction[] = [];

  if (wantsBucket && wantsBucket.income_ratio > 0.30) {
    const saving = round2(Math.max(0, (wantsBucket.income_ratio - 0.30) * baseIncome));
    actions.push({
      title: "Reduzir gastos discricionários",
      reason: `Gastos discricionários em ${(wantsBucket.income_ratio * 100).toFixed(0)}% da renda (meta: 30%).`,
      estimated_monthly_impact: saving,
      destination: "gastos",
    });
  }

  if (debtRatio > 0.20) {
    const debtBucket = buckets.find(b => b.key === "debt_goals");
    actions.push({
      title: "Desalavancar dívidas e parcelas",
      reason: `Dívidas representam ${(debtRatio * 100).toFixed(0)}% das saídas.`,
      estimated_monthly_impact: round2((debtBucket?.monthly_amount ?? 0) * 0.20),
      destination: "credito",
    });
  }

  if (runwayImediato !== null && runwayImediato < 3 && avgIncomeOp > avgExpenses) {
    actions.push({
      title: "Criar reserva de emergência",
      reason: `Runway imediato baixo (${round2(runwayImediato)} meses) com sobra operacional positiva.`,
      estimated_monthly_impact: round2(Math.max(0, avgIncomeOp - avgExpenses)),
      destination: "metas",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Monitorar orçamento por categoria",
      reason: "Situação financeira saudável — manter controle preventivo.",
      estimated_monthly_impact: 0,
      destination: "orcamento",
    });
  }

  const detailLinks: Record<DetailDestination, string> = {
    gastos: "/gastos",
    credito: "/credito",
    metas: "/metas",
    orcamento: "/orcamento",
    resumo: "/",
  };

  return {
    status,
    primary_cause: primaryCause,
    metrics,
    buckets,
    alerts,
    recommended_actions: actions,
    detail_links: detailLinks,
    rule_version: RULE_VERSION,
  };
}

// ── handler HTTP ───────────────────────────────────────────────────────────
export async function handleFinancialDiagnosis(
  _req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const raw = await db.getFinancialDiagnosisData();
  const diagnosis = computeDiagnosis(raw);
  return jsonResponse(diagnosis);
}
