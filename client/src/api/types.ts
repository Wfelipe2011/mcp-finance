export interface User {
  id: number;
  name: string;
  display_name: string;
}

export type UserRole = "admin" | "member";

export interface JwtPayload {
  exp: number;
  tenant_id: string;
  tenant_name: string;
  role: UserRole;
}

export type GoalType = 'saving' | 'spending';
export type GoalStatus = 'active' | 'achieved' | 'abandoned';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface CategorizationRule {
  id: number;
  tenant_id: string;
  pattern: string;
  category_id_override: string;
  category_pt: string | null;
  note: string | null;
  priority: number;
  match_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryLabel {
  category_id: string;
  name_pt: string;
  group_id: string;
  group_name_pt: string;
}

export interface CategoryGroup {
  group_id: string;
  group_name_pt: string;
}


export interface BudgetExecution {
  id: number;
  tenant_id: string;
  category_pt: string;
  monthly_limit: number;
  spent_amount: number;
  remaining: number;
  used_ratio: number;
  budget_status: BudgetStatus;
  is_active: boolean;
  created_at: string;
}

export interface Goal {
  id: number;
  tenant_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  category_group: string | null;
  deadline: string | null;
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  progress_ratio: number;
  progress_pct: number;
  days_remaining: number | null;
  is_overdue: boolean;
}

export interface CashflowMensal {
  year: number;
  month: number;
  month_name_pt: string;
  total_receitas: number;
  total_despesas: number;
  saldo_liquido: number;
  num_receitas: number;
  num_despesas: number;
  total_emprestimos?: number;
  total_receitas_operacionais?: number;
}

export interface GastoGrupo {
  group_pt: string;
  num_transacoes: number;
  total_gastos: number;
  ticket_medio: number;
}

export interface GastoCategoria {
  group_pt: string;
  category_pt: string;
  num_transacoes: number;
  total_gastos: number;
  ticket_medio: number;
}

export interface GastoNovo {
  group_pt: string;
  category_pt: string;
  display_name: string;
  num_transacoes: number;
  total_gastos: number;
}

export interface GastosMensais {
  grupos: GastoGrupo[];
  categorias: GastoCategoria[];
  novos: GastoNovo[];
}

export interface Compromisso {
  description: string;
  purchase_day: string;
  amount: number;
  account_id: string;
  cartao: string;
  dono: string;
  category_pt: string | null;
  category_group_pt: string | null;
  installment_atual: number;
  total_installments: number;
  compromisso_restante: number;
}

export interface CompromissoResumo {
  description: string;
  purchase_day: string;
  installment_atual: number;
  total_installments: number;
  amount: number;
  compromisso_restante: number;
  dono: string;
  category_pt: string | null;
}

export interface CartaoResumo {
  account_id: string;
  cartao: string;
  cc_credit_limit: number | null;
  total_comprometido: number;
  compromissos: CompromissoResumo[];
}

export interface ParcelaTimelineBreakdown {
  description: string;
  installment_amount: number;
}

export interface ParcelaTimeline {
  mes_referencia: string;
  account_id: string;
  cartao: string;
  total_parcelas_mes: number;
  breakdown: ParcelaTimelineBreakdown[];
}

export interface CashflowProjetado {
  year: number;
  month: number;
  month_name_pt: string | null;
  total_receitas: number | null;
  total_despesas: number | null;
  saldo_liquido: number | null;
  is_projected: boolean;
}

export interface Runway {
  saldo_liquido: number;
  saldo_investimentos: number;
  media_saidas_90d: number | null;
  runway_imediato_meses: number | null;
  runway_total_meses: number | null;
}

export interface PatrimonioItem {
  account_id: string;
  nome: string;
  tipo: string;
  subtipo: string;
  banco: string | null;
  dono: string | null;
  moeda: string | null;
  saldo_atual: number | null;
  limite_credito: number | null;
  credito_disponivel: number | null;
}

export interface Patrimonio {
  items: PatrimonioItem[];
  total_patrimonio: number;
}

export interface InvestimentoMensal {
  year: number;
  month: number;
  month_name_pt: string;
  investment_name: string;
  investment_type: string;
  investment_subtype: string | null;
  movement_type: string;
  num_movimentacoes: number;
  total_bruto: number;
  total_liquido: number;
}

export interface NotableExpense {
  description: string;
  amount: number;
  reason: string;
}

export interface DigestResponse {
  status: 'ready' | 'pending';
  data?: Digest;
  coverage?: number;
}

export interface Digest {
  year: number;
  month: number;
  cashflow_real: number | null;
  debt_inflows: number | null;
  debt_payments: number | null;
  narrative_pt: string | null;
  structured_summary: unknown | null;
  flags: string[] | null;
  notable_expenses: NotableExpense[] | null;
  enrichment_coverage: number | null;
  model_version: string | null;
  digest_at: string;
}

export interface Transacao {
  transaction_id: string;
  category_id: string | null;
  date_day: string;
  description: string;
  category_pt: string | null;
  category_group_pt: string | null;
  amount_signed: number;
  transaction_kind: string;
  owner_normalized: string;
  merchant_name: string | null;
  is_recurring: boolean | null;
  anomaly_score: number | null;
  tags: string[] | null;
}

export interface TransacoesResponse {
  items: Transacao[];
  total: number;
}

export interface GrupoTendencia {
  group_pt: string;
  media_mensal: number;
  meses_presentes: number;
}

export interface RecorrenteAI {
  merchant_name: string;
  category_group_pt: string;
  media_valor: number;
  ocorrencias: number;
  recurrence_period: string | null;
}

export interface Tendencias {
  grupos: GrupoTendencia[];
  recorrentes: RecorrenteAI[];
}

export interface ForecastMonth {
  year: number;
  month: number;
  type: "real" | "forecast";
  group_pt: string;
  category_pt?: string;
  amount: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastGroupsResponse {
  has_forecast: boolean;
  months: ForecastMonth[];
}

export interface ForecastCategoriesResponse {
  has_forecast: boolean;
  months: ForecastMonth[];
}

export interface ForecastMessage {
  has_message: boolean;
  message_pt?: string;
  message_date?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
}

export interface SecondaryInsight {
  category_pt: string;
  group_pt: string;
  probability: number;
  estimated_amount: number;
  lower_bound: number;
  upper_bound: number;
}

export interface DailyInsight {
  has_insight: boolean;
  insight_type: string;
  message_pt: string;
  category_pt: string | null;
  group_pt: string | null;
  probability: number | null;
  estimated_amount: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  signal_count: number | null;
  period_months: number;
  insight_date: string;
  secondary_insights: SecondaryInsight[];
}

export interface CategoryExclusion {
  category_pt: string;
  excluded: boolean;
}

export interface DailyExclusion {
  transaction_date: string;
  category_pt: string;
  correction_tag: string | null;
}

export interface MessagesRange {
  dates: string[];
}

// ── Simulação ────────────────────────────────────────────────────────────────

export type SimulationStatus = 'open' | 'closed';
export type SimulationItemType = 'new_purchase' | 'recurring' | 'income_adjustment' | 'exclusion';
export type SimulationClassification = 'viavel' | 'apertado' | 'inviavel';

export interface Simulation {
  id: string;
  tenant_id: string;
  name: string;
  status: SimulationStatus;
  horizon_months: number;
  llm_message: string | null;
  llm_model: string | null;
  llm_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationItem {
  id: string;
  simulation_id: string;
  tenant_id: string;
  item_type: SimulationItemType;
  label: string;
  category_pt: string | null;
  total_amount: number | null;
  installments: number | null;
  monthly_amount: number | null;
  is_exclusion: boolean;
  excluded_transaction_ids: string[] | null;
  direction: 'income' | 'expense' | null;
}

export interface SimulationMonth {
  simulation_id: string;
  tenant_id: string;
  month_offset: number;
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  balance: number;
}

export interface SimulationWithDetails extends Simulation {
  items: SimulationItem[];
  months: SimulationMonth[];
}

export interface SimulationItemPayload {
  item_type: SimulationItemType;
  label: string;
  category_pt?: string | null;
  total_amount?: number | null;
  installments?: number | null;
  monthly_amount?: number | null;
  is_exclusion?: boolean;
  excluded_transaction_ids?: string[] | null;
  direction?: 'income' | 'expense' | null;
}

export interface SimulationCalculatePayload {
  horizon_months: number;
  items: SimulationItemPayload[];
  exclusions?: string[];
}

export interface SimulationCreatePayload extends SimulationCalculatePayload {
  name: string;
}

export interface SimulationCalculateResult {
  months: SimulationMonth[];
}
