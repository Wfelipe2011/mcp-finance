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
  media_saidas_90d: number | null;
  runway_meses: number | null;
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
