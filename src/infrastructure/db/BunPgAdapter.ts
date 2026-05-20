import { SQL } from "bun";
import type { ItemRepository } from "../../domain/ports/repositories/ItemRepository.ts";
import type { AccountRepository } from "../../domain/ports/repositories/AccountRepository.ts";
import type { TransactionRepository } from "../../domain/ports/repositories/TransactionRepository.ts";
import type { InvestmentRepository } from "../../domain/ports/repositories/InvestmentRepository.ts";
import type { InvestmentTransactionRepository } from "../../domain/ports/repositories/InvestmentTransactionRepository.ts";
import type { EnrichTransactionsRepository } from "../../domain/ports/repositories/EnrichTransactionsRepository.ts";
import type { Item } from "../../domain/entities/Item.ts";
import type { Account } from "../../domain/entities/Account.ts";
import type { Transaction } from "../../domain/entities/Transaction.ts";
import type { Investment } from "../../domain/entities/Investment.ts";
import type { InvestmentTransaction } from "../../domain/entities/InvestmentTransaction.ts";
import type { TransactionInsight } from "../ai/schemas/TransactionInsightSchema.ts";
import type { MonthlyDigest } from "../ai/schemas/MonthlyDigestSchema.ts";

export interface UnenrichedTransaction {
  transaction_id: string;
  description: string;
  amount_signed: number;
  transaction_kind: string;
  category_pt: string | null;
  category_group_pt: string | null;
}

export interface InsightRow extends TransactionInsight {
  transaction_id: string;
  model_version: string;
}

export interface MonthInsightRow {
  transaction_id: string;
  amount_signed: number;
  transaction_kind: string;
  is_debt_related: boolean;
  merchant_name: string | null;
  tags: string[];
  anomaly_score: number | null;
  description: string;
}

export interface DigestRow extends MonthlyDigest {
  year: number;
  month: number;
  cashflow_real: number;
  debt_inflows: number;
  debt_payments: number;
  enrichment_coverage: number;
  model_version: string;
}

export interface WorkerRow {
  id: string;
  name: string;
  ai_base_url: string;
  ai_api_key: string | null;
  ai_model: string;
  kind: string;
  status: string;
  error_count: number;
  last_error: string | null;
  jobs_done: number;
  last_seen_at: string | null;
  created_at: string;
  avg_duration_7d_secs: number | null;
  median_duration_7d_secs: number | null;
  avg_duration_all_secs: number | null;
  median_duration_all_secs: number | null;
}

export interface DigestJob {
  id: number;
  tenant_id: string;
  year: number;
  month: number;
  status: string;
  attempts: number;
  worker_id: string | null;
}

export interface ForecastJob {
  id: number;
  tenant_id: string;
  job_date: string;
  status: string;
  attempts: number;
  worker_id: string | null;
}



export interface GoalRow {
  id: number;
  tenant_id: string;
  name: string;
  goal_type: 'saving' | 'spending';
  target_amount: number;
  current_amount: number;
  category_group: string | null;
  deadline: string | null;
  status: 'active' | 'achieved' | 'abandoned';
  notes: string | null;
  created_at: string;
}

export interface GoalProgressRow extends GoalRow {
  progress_ratio: number;
  progress_pct: number;
  days_remaining: number | null;
  is_overdue: boolean;
}

export interface BudgetRow {
  id: number;
  tenant_id: string;
  category_pt: string;
  monthly_limit: number;
  is_active: boolean;
  created_at: string;
}

export interface BudgetExecutionRow extends BudgetRow {
  spent_amount: number;
  remaining: number;
  used_ratio: number;
  budget_status: 'ok' | 'warning' | 'exceeded';
}

export interface SimpleQueueStats {
  pending: number;
  running: number;
  done: number;
  error: number;
  skipped?: number;
}

export interface TenantRow {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export interface EnrichJob {
  id: number;
  tenant_id: string;
  transaction_id: string;
  date: string | null;
  status: string;
  attempts: number;
  worker_id: string | null;
}

export interface QueueStats {
  pending: number;
  running: number;
  done: number;
  error: number;
  total: number;
  error_rate_current: number;
  error_rate_historical: number;
  throughput_jobs_per_sec: number | null;
  eta_seconds: number | null;
  throughput_source: 'workers' | 'global' | 'unavailable';
}

export interface AiInsightsRepository {
  getUnenriched(limit: number): Promise<UnenrichedTransaction[]>;
  getUnenrichedById(transactionId: string): Promise<UnenrichedTransaction | null>;
  upsertOne(row: InsightRow): Promise<void>;
}

export interface PreviousDigestRow {
  year: number;
  month: number;
  cashflow_real: number;
  debt_inflows: number;
  debt_payments: number;
  narrative_pt: string | null;
  flags: string[] | null;
}

export interface AiDigestsRepository {
  getMonthInsights(year: number, month: number): Promise<MonthInsightRow[]>;
  getTotalTransactionCount(year: number, month: number): Promise<number>;
  getPreviousDigests(year: number, month: number, limit: number): Promise<PreviousDigestRow[]>;
  upsert(row: DigestRow): Promise<void>;
}

export interface PredictionByGroup {
  group_pt: string;
  target_year: number;
  target_month: number;
  predicted_total: number;
}

export interface SpendingByGroup {
  group_pt: string;
  total_gastos: number;
}

export interface ForecastAiMessage {
  tenant_id: string;
  message_date: string;
  message_pt: string;
  context_json: Record<string, unknown>;
  model_version: string;
  created_at: string;
}

export interface RealSpendingByGroup {
  year: number;
  month: number;
  group_pt: string;
  total_gastos: number;
}

export interface RealSpendingByCategory {
  year: number;
  month: number;
  category_pt: string;
  group_pt: string;
  total_gastos: number;
}

export interface ForecastByGroup {
  target_year: number;
  target_month: number;
  group_pt: string;
  predicted_total: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastByCategory {
  target_year: number;
  target_month: number;
  category_pt: string;
  group_pt: string;
  predicted_total: number;
  lower_bound: number;
  upper_bound: number;
}

export interface DailyInsightMessage {
  tenant_id: string;
  message_date: string;
  message_pt: string;
  context_json: Record<string, unknown>;
  model_version: string;
  insight_type: string;
  created_at: string;
}

export interface DailyHabitSignal {
  day_of_week: number;
  day_of_month: number;
  category_pt: string;
  group_pt: string;
  occurrences: number;
  avg_amount: number;
  std_amount: number | null;
  occurrences_6m: number;
}

export interface DailyPrediction {
  prediction_date: string;
  category_pt: string;
  group_pt: string;
  predicted_amount: number;
  lower_bound: number;
  upper_bound: number;
  probability: number;
  model_version: string;
}



export interface ForecastRepository {
  getPredictionsByGroup(): Promise<PredictionByGroup[]>;
  getCurrentMonthSpendingByGroup(): Promise<SpendingByGroup[]>;
  saveDailyMessage(date: string, message: string, contextJson: Record<string, unknown>, modelVersion: string): Promise<void>;
  getDailyMessage(date: string): Promise<ForecastAiMessage | null>;
  getRealSpendingByGroup(months: number): Promise<RealSpendingByGroup[]>;
  getForecastByGroup(): Promise<ForecastByGroup[]>;
  getRealSpendingByCategory(months: number): Promise<RealSpendingByCategory[]>;
  getForecastByCategory(): Promise<ForecastByCategory[]>;
  getTodayMessage(): Promise<ForecastAiMessage | null>;
  getDailyInsight(date: string): Promise<DailyInsightMessage | null>;
  getDailyHabitSignals(date: string): Promise<DailyHabitSignal[]>;
  getDailyPrediction(date: string): Promise<DailyPrediction[]>;
  saveDailyInsightMessage(date: string, message: string, contextJson: Record<string, unknown>, modelVersion: string, insightType: string): Promise<void>;
}

export interface CategoryRuleRow {
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

export interface CategoryLabelRow {
  category_id: string;
  name_pt: string;
  group_id: string;
  group_name_pt: string;
}

export interface CompromissoItem {
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
  compromissos: CompromissoItem[];
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

function parseJsonbField<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
}

export class BunPgAdapter {
  private readonly sql: SQL;
  private readonly ownsSql: boolean;

  readonly items: ItemRepository;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly investments: InvestmentRepository;
  readonly investmentTransactions: InvestmentTransactionRepository;
  readonly enrichTransactions: EnrichTransactionsRepository;
  readonly aiInsights: AiInsightsRepository;
  readonly aiDigests: AiDigestsRepository;
  readonly forecast: ForecastRepository;
  readonly goals: {
    getAll(): Promise<GoalProgressRow[]>;
    create(data: Omit<GoalRow, 'id' | 'tenant_id' | 'created_at'>): Promise<GoalRow>;
    update(id: number, data: Partial<Pick<GoalRow, 'name' | 'current_amount' | 'deadline' | 'status' | 'notes' | 'target_amount'>>): Promise<GoalRow | null>;
    remove(id: number): Promise<void>;
    getActiveForDigest(): Promise<GoalProgressRow[]>;
  };
  readonly budgets: {
    getAll(): Promise<BudgetExecutionRow[]>;
    upsert(data: { category_pt: string; monthly_limit: number }): Promise<BudgetRow>;
    remove(id: number): Promise<void>;
    getExceededOrWarning(): Promise<BudgetExecutionRow[]>;
  };
  readonly users: {
    getAll(): Promise<{ id: number; name: string; display_name: string }[]>;
    updateDisplayName(id: number, displayName: string): Promise<{ id: number; name: string; display_name: string } | null>;
  };
  readonly workers: {
    create(data: { name: string; ai_base_url: string; ai_api_key?: string | null; ai_model: string }): Promise<WorkerRow>;
    findAll(): Promise<WorkerRow[]>;
    findActive(): Promise<WorkerRow[]>;
    update(id: string, data: Partial<{ name: string; ai_base_url: string; ai_api_key: string | null; ai_model: string; status: string; error_count: number; last_error: string | null; last_seen_at: string | null }>): Promise<WorkerRow | null>;
    remove(id: string): Promise<boolean>;
  };
  readonly tenants: {
    findAll(): Promise<TenantRow[]>;
    create(data: { name: string; email: string; password_hash: string; pluggy_email?: string | null; pluggy_password?: string | null }): Promise<TenantRow>;
    setStatus(id: string, status: string): Promise<TenantRow | null>;
  };
  readonly enrich_jobs: {
    enqueue(tenantId: string, transactionIds: string[]): Promise<number>;
    nextJob(workerId: string): Promise<EnrichJob | null>;
    markDone(jobId: number, workerId: string): Promise<void>;
    markError(jobId: number, error: string): Promise<void>;
    releaseStuck(): Promise<void>;
    getQueueStats(): Promise<QueueStats>;
  };
  readonly digest_jobs: {
    enqueue(tenants: { id: string; year: number; month: number }[]): Promise<number>;
    nextJob(workerId: string): Promise<DigestJob | null>;
    markDone(jobId: number): Promise<void>;
    markError(jobId: number, msg: string): Promise<void>;
    markSkipped(jobId: number): Promise<void>;
    releaseStuck(): Promise<void>;
    getQueueStats(): Promise<SimpleQueueStats>;
  };
  readonly forecast_jobs: {
    enqueue(tenants: { id: string }[], date: string): Promise<number>;
    nextJob(workerId: string): Promise<ForecastJob | null>;
    markDone(jobId: number): Promise<void>;
    markError(jobId: number, msg: string): Promise<void>;
    releaseStuck(): Promise<void>;
    getQueueStats(): Promise<SimpleQueueStats>;
  };
  readonly categoryRules: {
    list(): Promise<CategoryRuleRow[]>;
    create(value: string, categoryId: string, note?: string): Promise<CategoryRuleRow>;
    update(id: number, fields: Partial<{ value: string; category_id: string; note: string; is_active: boolean }>): Promise<CategoryRuleRow | null>;
    remove(id: number): Promise<boolean>;
    reorder(id: number, direction: 'up' | 'down'): Promise<void>;
    applyToHistory(id: number): Promise<number>;
  };
  readonly categories: {
    list(): Promise<CategoryLabelRow[]>;
  };
  readonly transactionCategory: {
    override(transactionId: string, categoryId: string): Promise<boolean>;
    countByDescriptionLike(text: string): Promise<number>;
  };

  constructor(private readonly tenantId?: string, externalSql?: SQL) {
    if (externalSql) {
      this.sql = externalSql;
      this.ownsSql = false;
    } else {
      const url = process.env["DATABASE_URL"];
      if (!url) throw new Error("DATABASE_URL is not set");
      this.sql = new SQL(url);
      this.ownsSql = true;
    }

    const sql = this.sql;
    const tid = this.tenantId;

    // ── items ────────────────────────────────────────────────────────────────
    this.items = {
      async upsertMany(rows: Item[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          for (const r of rows) {
            await tx`
              INSERT INTO items (
                tenant_id, id, connector, status, execution_status, products,
                last_updated_at, created_at, updated_at, synced_at
              ) VALUES (
                ${tid}::uuid, ${r.id}, ${r.connector}, ${r.status}, ${r.executionStatus}, ${r.products},
                ${r.lastUpdatedAt}, ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO UPDATE SET
                connector        = EXCLUDED.connector,
                status           = EXCLUDED.status,
                execution_status = EXCLUDED.execution_status,
                products         = EXCLUDED.products,
                last_updated_at  = EXCLUDED.last_updated_at,
                updated_at       = EXCLUDED.updated_at,
                synced_at        = EXCLUDED.synced_at
            `;
          }
        });
      },
    };

    // ── accounts ─────────────────────────────────────────────────────────────
    this.accounts = {
      async upsertMany(rows: Account[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          for (const r of rows) {
            await tx`
              INSERT INTO accounts (
                tenant_id, id, item_id, type, subtype, name, balance, currency_code, number,
                owner, tax_number, marketing_name,
                transfer_number, closing_balance, automatically_invested_balance,
                overdraft_contracted_limit, overdraft_used_limit, unarranged_overdraft_amount,
                cc_level, cc_brand, cc_balance_due_date, cc_credit_limit,
                cc_available_credit_limit, cc_minimum_payment, cc_balance_foreign_currency,
                created_at, updated_at, synced_at
              ) VALUES (
                ${tid}::uuid, ${r.id}, ${r.itemId}, ${r.type}, ${r.subtype}, ${r.name}, ${r.balance},
                ${r.currencyCode}, ${r.number}, ${r.owner}, ${r.taxNumber}, ${r.marketingName},
                ${r.transferNumber}, ${r.closingBalance}, ${r.automaticallyInvestedBalance},
                ${r.overdraftContractedLimit}, ${r.overdraftUsedLimit}, ${r.unarrangedOverdraftAmount},
                ${r.ccLevel}, ${r.ccBrand}, ${r.ccBalanceDueDate}, ${r.ccCreditLimit},
                ${r.ccAvailableCreditLimit}, ${r.ccMinimumPayment}, ${r.ccBalanceForeignCurrency},
                ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO UPDATE SET
                balance                        = EXCLUDED.balance,
                closing_balance                = EXCLUDED.closing_balance,
                automatically_invested_balance = EXCLUDED.automatically_invested_balance,
                overdraft_contracted_limit     = EXCLUDED.overdraft_contracted_limit,
                overdraft_used_limit           = EXCLUDED.overdraft_used_limit,
                unarranged_overdraft_amount    = EXCLUDED.unarranged_overdraft_amount,
                cc_credit_limit                = EXCLUDED.cc_credit_limit,
                cc_available_credit_limit      = EXCLUDED.cc_available_credit_limit,
                cc_minimum_payment             = EXCLUDED.cc_minimum_payment,
                cc_balance_foreign_currency    = EXCLUDED.cc_balance_foreign_currency,
                cc_balance_due_date            = EXCLUDED.cc_balance_due_date,
                updated_at                     = EXCLUDED.updated_at,
                synced_at                      = EXCLUDED.synced_at
            `;
          }
        });
      },
    };

    // ── transactions ──────────────────────────────────────────────────────────
    this.transactions = {
      async upsertMany(rows: Transaction[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          for (const r of rows) {
            await tx`
              INSERT INTO transactions (
                tenant_id, id, account_id, description, description_raw, currency_code,
                amount, amount_in_account_currency, date, category, category_id,
                balance, provider_code, status, type, operation_type, provider_id, "order",
                payment_data, cc_card_number, cc_bill_id, cc_purchase_date,
                cc_total_installments, cc_installment_number, cc_payee_mcc,
                merchant, acquirer_data, created_at, updated_at, synced_at
              ) VALUES (
                ${tid}::uuid, ${r.id}, ${r.accountId}, ${r.description}, ${r.descriptionRaw}, ${r.currencyCode},
                ${r.amount}, ${r.amountInAccountCurrency}, ${r.date}, ${r.category}, ${r.categoryId},
                ${r.balance}, ${r.providerCode}, ${r.status}, ${r.type}, ${r.operationType},
                ${r.providerId}, ${r.order}, ${r.paymentData}, ${r.ccCardNumber}, ${r.ccBillId},
                ${r.ccPurchaseDate}, ${r.ccTotalInstallments}, ${r.ccInstallmentNumber}, ${r.ccPayeeMCC},
                ${r.merchant}, ${r.acquirerData}, ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO UPDATE SET
                status      = EXCLUDED.status,
                description = EXCLUDED.description,
                category    = EXCLUDED.category,
                category_id = EXCLUDED.category_id,
                balance     = EXCLUDED.balance,
                updated_at  = EXCLUDED.updated_at,
                synced_at   = EXCLUDED.synced_at
            `;
          }
        });
      },
    };

    // ── investments ───────────────────────────────────────────────────────────
    this.investments = {
      async upsertMany(rows: Investment[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          for (const r of rows) {
            await tx`
              INSERT INTO investments (
                tenant_id, id, item_id, name, type, subtype, balance, currency_code,
                value, quantity, amount, taxes, taxes2,
                amount_profit, amount_withdrawal, amount_original,
                last_month_rate, last_twelve_months_rate, annual_rate, fixed_annual_rate, rate, rate_type,
                code, isin, number, metadata,
                issuer, issuer_cnpj, issue_date, purchase_date, due_date, date,
                owner, institution, status, created_at, updated_at, synced_at
              ) VALUES (
                ${tid}::uuid, ${r.id}, ${r.itemId}, ${r.name}, ${r.type}, ${r.subtype}, ${r.balance}, ${r.currencyCode},
                ${r.value}, ${r.quantity}, ${r.amount}, ${r.taxes}, ${r.taxes2},
                ${r.amountProfit}, ${r.amountWithdrawal}, ${r.amountOriginal},
                ${r.lastMonthRate}, ${r.lastTwelveMonthsRate}, ${r.annualRate}, ${r.fixedAnnualRate},
                ${r.rate}, ${r.rateType},
                ${r.code}, ${r.isin}, ${r.number}, ${r.metadata},
                ${r.issuer}, ${r.issuerCNPJ}, ${r.issueDate}, ${r.purchaseDate}, ${r.dueDate}, ${r.date},
                ${r.owner}, ${r.institution}, ${r.status}, ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO UPDATE SET
                balance                 = EXCLUDED.balance,
                value                   = EXCLUDED.value,
                quantity                = EXCLUDED.quantity,
                amount                  = EXCLUDED.amount,
                taxes                   = EXCLUDED.taxes,
                taxes2                  = EXCLUDED.taxes2,
                amount_profit           = EXCLUDED.amount_profit,
                amount_withdrawal       = EXCLUDED.amount_withdrawal,
                last_month_rate         = EXCLUDED.last_month_rate,
                last_twelve_months_rate = EXCLUDED.last_twelve_months_rate,
                annual_rate             = EXCLUDED.annual_rate,
                fixed_annual_rate       = EXCLUDED.fixed_annual_rate,
                rate                    = EXCLUDED.rate,
                status                  = EXCLUDED.status,
                updated_at              = EXCLUDED.updated_at,
                synced_at               = EXCLUDED.synced_at
            `;
          }
        });
      },
    };

    // ── investment_transactions ───────────────────────────────────────────────
    this.investmentTransactions = {
      async insertMany(rows: InvestmentTransaction[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          for (const r of rows) {
            await tx`
              INSERT INTO investment_transactions (
                tenant_id, id, investment_id, description, amount, value, quantity,
                trade_date, date, type, net_amount, movement_type, brokerage_number, agreed_rate,
                exp_income_tax, exp_brokerage_fee, exp_service_tax, exp_settlement_fee,
                exp_clearing_fee, exp_stock_exchange_fee, exp_custody_fee, exp_operating_fee,
                exp_trading_assets_notice_fee, exp_maintenance_fee, exp_other,
                created_at, updated_at, synced_at
              ) VALUES (
                ${tid}::uuid, ${r.id}, ${r.investmentId}, ${r.description}, ${r.amount}, ${r.value}, ${r.quantity},
                ${r.tradeDate}, ${r.date}, ${r.type}, ${r.netAmount}, ${r.movementType},
                ${r.brokerageNumber}, ${r.agreedRate},
                ${r.expIncomeTax}, ${r.expBrokerageFee}, ${r.expServiceTax}, ${r.expSettlementFee},
                ${r.expClearingFee}, ${r.expStockExchangeFee}, ${r.expCustodyFee}, ${r.expOperatingFee},
                ${r.expTradingAssetsNoticeFee}, ${r.expMaintenanceFee}, ${r.expOther},
                ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO NOTHING
            `;
          }
        });
      },
    };

    // ── enrichTransactions ────────────────────────────────────────────────────
    this.enrichTransactions = {
      async enrich(): Promise<void> {
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`DELETE FROM transactions_enriched`;
          // Seed tenant_members from accounts.owner (ON CONFLICT DO NOTHING preserves display_name customizations)
          await tx`
            INSERT INTO tenant_members (tenant_id, name, display_name)
            SELECT DISTINCT
              current_setting('app.tenant_id')::UUID,
              LOWER(TRIM(a.owner)),
              initcap(split_part(a.owner, ' ', 1))
            FROM accounts a
            WHERE a.owner IS NOT NULL AND TRIM(a.owner) != ''
            ON CONFLICT (tenant_id, name) DO NOTHING
          `;
          await tx`
            INSERT INTO transactions_enriched
            WITH deduplicated AS (
              SELECT DISTINCT ON (account_id, date::date, ABS(amount), type)
                *
              FROM transactions
              ORDER BY account_id, date::date, ABS(amount), type, updated_at DESC
            ),
            kind AS (
              SELECT
                t.id,
                CASE
                  WHEN t.operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')
                    THEN 'INVEST'
                  WHEN t.type = 'CREDIT'
                    AND t.payment_data IS NOT NULL AND t.payment_data != ''
                    AND (t.payment_data::jsonb->'payer'->>'accountNumber')
                        IN (SELECT DISTINCT number FROM accounts WHERE number IS NOT NULL)
                    THEN 'TRANSFER'
                  WHEN t.type = 'DEBIT'
                    AND t.payment_data IS NOT NULL AND t.payment_data != ''
                    AND (t.payment_data::jsonb->'receiver'->>'accountNumber')
                        IN (SELECT DISTINCT number FROM accounts WHERE number IS NOT NULL)
                    THEN 'TRANSFER'
                  WHEN t.type = 'DEBIT'
                    AND t.account_id IN (SELECT id FROM accounts WHERE type = 'BANK')
                    AND (t.description ILIKE '%pagamento de fatura%' OR t.description ILIKE '%gastos cartao%')
                    THEN 'TRANSFER'
                  WHEN t.type = 'CREDIT'
                    AND t.account_id IN (SELECT id FROM accounts WHERE type = 'CREDIT')
                    AND (t.description ILIKE '%pagamento%fatura%' OR t.description ILIKE '%inclusao pgto%')
                    THEN 'TRANSFER'
                  WHEN t.type = 'DEBIT'
                    AND cg.group_id IN (
                      SELECT group_id FROM category_groups WHERE name_pt = 'Transferência entre Próprias Contas'
                    )
                    THEN 'TRANSFER'
                  WHEN t.type = 'DEBIT'
                    AND cg.group_id IN (
                      SELECT group_id FROM category_groups WHERE name_pt = 'Investimentos'
                    )
                    THEN 'INVEST'
                  WHEN t.type = 'CREDIT'
                    AND cg.group_id IN (
                      SELECT group_id FROM category_groups WHERE name_pt = 'Transferência entre Próprias Contas'
                    )
                    THEN 'TRANSFER'
                  WHEN t.type = 'DEBIT' THEN 'EXPENSE'
                  ELSE 'INCOME'
                END AS transaction_kind
              FROM deduplicated t
              LEFT JOIN category_groups cg ON cg.group_id = LEFT(t.category_id, 2)
            )
            SELECT
              t.tenant_id,
              t.id,
              t.account_id,
              t.description,
              t.description_raw,
              'BRL' AS currency_code,
              COALESCE(
                CASE WHEN t.currency_code != 'BRL' THEN t.amount_in_account_currency ELSE NULL END,
                t.amount
              ) AS amount,
              t.date,
              t.category,
              t.category_id,
              t.status,
              t.type,
              t.operation_type,
              t.cc_bill_id,
              t.cc_purchase_date,
              t.cc_total_installments,
              t.cc_installment_number,
              t.cc_payee_mcc,
              k.transaction_kind,
              (
                SELECT peer.id
                FROM accounts peer
                WHERE (
                  (t.type = 'CREDIT' AND peer.number = (t.payment_data::jsonb->'payer'->>'accountNumber'))
                  OR
                  (t.type = 'DEBIT' AND peer.number = (t.payment_data::jsonb->'receiver'->>'accountNumber'))
                )
                ORDER BY
                  CASE peer.subtype WHEN 'CHECKING_ACCOUNT' THEN 0 ELSE 1 END,
                  peer.id
                LIMIT 1
              ) AS peer_account_id,
              k.transaction_kind IN ('EXPENSE', 'INCOME') AS is_real_cashflow,
              LOWER(TRIM(a.owner)) AS owner_normalized,
              cl.name_pt AS category_pt,
              LEFT(t.category_id, 2) AS category_group,
              cg.name_pt AS category_group_pt
            FROM deduplicated t
            JOIN kind k ON k.id = t.id
            JOIN accounts a ON a.id = t.account_id
            LEFT JOIN category_labels cl ON cl.category_id = t.category_id
            LEFT JOIN category_groups cg ON cg.group_id = LEFT(t.category_id, 2)
          `;
          // apply category overrides (ILIKE pattern matching, lowest priority wins)
          await tx`
            UPDATE transactions_enriched te
            SET
              category_id       = co.category_id_override,
              category_pt       = cl.name_pt,
              category_group    = LEFT(co.category_id_override, 2),
              category_group_pt = cg.name_pt
            FROM (
              SELECT DISTINCT ON (tx.id)
                tx.id        AS tx_id,
                co.id        AS override_id,
                co.category_id_override
              FROM transactions_enriched tx
              JOIN category_overrides co ON tx.description ILIKE co.pattern AND co.is_active = true
              ORDER BY tx.id, co.priority ASC
            ) best
            JOIN category_overrides co ON co.id = best.override_id
            JOIN category_labels cl ON cl.category_id = co.category_id_override
            JOIN category_groups cg ON cg.group_id = LEFT(co.category_id_override, 2)
            WHERE te.id = best.tx_id
          `;
          // increment match_count for each override rule that matched at least one transaction
          await tx`
            UPDATE category_overrides co
            SET match_count = match_count + matched.cnt
            FROM (
              SELECT co2.id, COUNT(*) AS cnt
              FROM transactions_enriched te
              JOIN category_overrides co2 ON te.description ILIKE co2.pattern AND co2.is_active = true
              GROUP BY co2.id
            ) matched
            WHERE co.id = matched.id
          `;
        });
      },
    };

    // ── aiInsights ────────────────────────────────────────────────────────────
    this.aiInsights = {
      async getUnenriched(limit: number): Promise<UnenrichedTransaction[]> {
        const rows = await sql<UnenrichedTransaction[]>`
          SELECT
            t.transaction_id,
            t.description,
            t.amount_signed,
            t.transaction_kind,
            t.category_pt,
            t.category_group_pt
          FROM f_transacoes t
          WHERE NOT EXISTS (
            SELECT 1 FROM ai_transaction_insights ai WHERE ai.transaction_id = t.transaction_id
          )
          ORDER BY t.date_day ASC
          LIMIT ${limit}
        `;
        return rows;
      },

      async getUnenrichedById(transactionId: string): Promise<UnenrichedTransaction | null> {
        const rows = await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<UnenrichedTransaction[]>`
            SELECT
              t.transaction_id,
              t.description,
              t.amount_signed,
              t.transaction_kind,
              t.category_pt,
              t.category_group_pt
            FROM f_transacoes t
            WHERE t.transaction_id = ${transactionId}
            LIMIT 1
          `;
        });
        return rows[0] ?? null;
      },

      async upsertOne(row: InsightRow): Promise<void> {
        // Bun SQL doesn't auto-serialize JS arrays to Postgres text[] literals
        const tagsLiteral = row.tags?.length
          ? "{" + row.tags.map((t) => '"' + t.replace(/"/g, '\\"') + '"').join(",") + "}"
          : null;
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`
            INSERT INTO ai_transaction_insights (
              tenant_id, transaction_id, merchant_name, merchant_country,
              is_recurring, recurrence_period, expense_context,
              is_debt_related, anomaly_score, tags, category_hint,
              model_version, analyzed_at
            ) VALUES (
              ${tid}::uuid,
              ${row.transaction_id}, ${row.merchant_name ?? null}, ${row.merchant_country ?? null},
              ${row.is_recurring ?? null}, ${row.recurrence_period ?? null}, ${row.expense_context ?? null},
              ${row.is_debt_related}, ${row.anomaly_score ?? null}, ${tagsLiteral}::text[], ${row.category_hint ?? null},
              ${row.model_version}, NOW()
            )
            ON CONFLICT (tenant_id, transaction_id) DO UPDATE SET
              merchant_name     = EXCLUDED.merchant_name,
              merchant_country  = EXCLUDED.merchant_country,
              is_recurring      = EXCLUDED.is_recurring,
              recurrence_period = EXCLUDED.recurrence_period,
              expense_context   = EXCLUDED.expense_context,
              is_debt_related   = EXCLUDED.is_debt_related,
              anomaly_score     = EXCLUDED.anomaly_score,
              tags              = EXCLUDED.tags,
              category_hint     = EXCLUDED.category_hint,
              model_version     = EXCLUDED.model_version,
              analyzed_at       = NOW()
          `;
        });
      },
    };

    // ── aiDigests ─────────────────────────────────────────────────────────────
    this.aiDigests = {
      async getMonthInsights(year: number, month: number): Promise<MonthInsightRow[]> {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<MonthInsightRow[]>`
            SELECT
              ai.transaction_id,
              t.amount_signed,
              t.transaction_kind,
              ai.is_debt_related,
              ai.merchant_name,
              ai.tags,
              ai.anomaly_score,
              t.description
            FROM ai_transaction_insights ai
            JOIN f_transacoes t ON t.transaction_id = ai.transaction_id
            WHERE EXTRACT(YEAR  FROM t.date_day) = ${year}
              AND EXTRACT(MONTH FROM t.date_day) = ${month}
          `;
        });
      },

      async getTotalTransactionCount(year: number, month: number): Promise<number> {
        const rows = await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<[{ count: string }]>`
            SELECT COUNT(*) AS count
            FROM f_transacoes
            WHERE EXTRACT(YEAR  FROM date_day) = ${year}
              AND EXTRACT(MONTH FROM date_day) = ${month}
          `;
        });
        return parseInt(rows[0]?.count ?? "0", 10);
      },

      async getPreviousDigests(year: number, month: number, limit: number): Promise<PreviousDigestRow[]> {
        const rows = await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<PreviousDigestRow[]>`
            SELECT year, month, cashflow_real, debt_inflows, debt_payments, narrative_pt, flags
            FROM ai_monthly_digest
            WHERE (year * 100 + month) < (${year} * 100 + ${month})
            ORDER BY year DESC, month DESC
            LIMIT ${limit}
          `;
        });
        return rows.reverse(); // cronológico: mais antigo primeiro
      },

      async upsert(row: DigestRow): Promise<void> {
        // Bun SQL doesn't auto-serialize JS arrays to Postgres text[] literals
        const flagsLiteral = row.flags?.length
          ? "{" + row.flags.map((f) => '"' + f.replace(/"/g, '\\"') + '"').join(",") + "}"
          : null;
        await sql`
          INSERT INTO ai_monthly_digest (
            tenant_id,
            year, month,
            cashflow_real, debt_inflows, debt_payments,
            narrative_pt, structured_summary,
            flags, notable_expenses,
            enrichment_coverage, model_version, digest_at
          ) VALUES (
            current_setting('app.tenant_id')::UUID,
            ${row.year}, ${row.month},
            ${row.cashflow_real}, ${row.debt_inflows}, ${row.debt_payments},
            ${row.narrative_pt}, ${JSON.stringify(row.structured_summary)}::jsonb,
            ${flagsLiteral}::text[], ${JSON.stringify(row.notable_expenses)}::jsonb,
            ${row.enrichment_coverage}, ${row.model_version}, NOW()
          )
          ON CONFLICT (tenant_id, year, month) DO UPDATE SET
            cashflow_real       = EXCLUDED.cashflow_real,
            debt_inflows        = EXCLUDED.debt_inflows,
            debt_payments       = EXCLUDED.debt_payments,
            narrative_pt        = EXCLUDED.narrative_pt,
            structured_summary  = EXCLUDED.structured_summary,
            flags               = EXCLUDED.flags,
            notable_expenses    = EXCLUDED.notable_expenses,
            enrichment_coverage = EXCLUDED.enrichment_coverage,
            model_version       = EXCLUDED.model_version,
            digest_at           = NOW()
        `;
      },
    };

    // ── forecast ──────────────────────────────────────────────────────────────
    this.forecast = {
      async getPredictionsByGroup(): Promise<PredictionByGroup[]> {
        if (!tid) throw new Error("getPredictionsByGroup requires tenantId");
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<PredictionByGroup[]>`
            SELECT
              group_pt,
              target_year,
              target_month,
              SUM(predicted_amount)::float AS predicted_total
            FROM forecast_monthly_projection
            WHERE (target_year * 100 + target_month) > (${curYear} * 100 + ${curMonth})
            GROUP BY group_pt, target_year, target_month
            ORDER BY target_year, target_month, group_pt
          `;
          return rows.map((r) => ({ ...r, predicted_total: Number(r.predicted_total) }));
        });
      },

      async getCurrentMonthSpendingByGroup(): Promise<SpendingByGroup[]> {
        if (!tid) throw new Error("getCurrentMonthSpendingByGroup requires tenantId");
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<SpendingByGroup[]>`
            SELECT group_pt, total_gastos
            FROM cube_gastos_grupo_mensal
            WHERE year = ${year} AND month = ${month}
            ORDER BY total_gastos DESC
          `;
          return rows.map((r) => ({ ...r, total_gastos: Number(r.total_gastos) }));
        });
      },

      async saveDailyMessage(
        date: string,
        message: string,
        contextJson: Record<string, unknown>,
        modelVersion: string,
      ): Promise<void> {
        if (!tid) throw new Error("saveDailyMessage requires tenantId");
        await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`
            INSERT INTO forecast_ai_messages (tenant_id, message_date, message_pt, context_json, model_version, message_type)
            VALUES (${tid}::uuid, ${date}::date, ${message}, ${JSON.stringify(contextJson)}::jsonb, ${modelVersion}, 'monthly')
            ON CONFLICT (tenant_id, message_date, message_type) DO UPDATE SET
              message_pt    = EXCLUDED.message_pt,
              context_json  = EXCLUDED.context_json,
              model_version = EXCLUDED.model_version,
              created_at    = NOW()
          `;
        });
      },

      async getDailyMessage(date: string): Promise<ForecastAiMessage | null> {
        if (!tid) throw new Error("getDailyMessage requires tenantId");
        const rows = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<ForecastAiMessage[]>`
            SELECT tenant_id, message_date::text, message_pt, context_json, model_version, created_at::text
            FROM forecast_ai_messages
            WHERE message_date = ${date}::date
            LIMIT 1
          `;
        });
        return rows[0] ?? null;
      },

      async getRealSpendingByGroup(months: number): Promise<RealSpendingByGroup[]> {
        if (!tid) throw new Error("getRealSpendingByGroup requires tenantId");
        const now = new Date();
        const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
        const cutoffYear = cutoff.getFullYear();
        const cutoffMonth = cutoff.getMonth() + 1;
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<{ year: number; month: number; group_pt: string; total_gastos: number }[]>`
            SELECT year, month, group_pt, SUM(total_gastos) AS total_gastos
            FROM cube_gastos_mensais
            WHERE (year * 100 + month) BETWEEN (${cutoffYear} * 100 + ${cutoffMonth}) AND (${curYear} * 100 + ${curMonth})
            GROUP BY year, month, group_pt
            ORDER BY year, month, group_pt
          `;
          return rows.map((r) => ({
            year: Number(r.year),
            month: Number(r.month),
            group_pt: r.group_pt,
            total_gastos: Number(r.total_gastos),
          }));
        });
      },

      async getForecastByGroup(): Promise<ForecastByGroup[]> {
        if (!tid) throw new Error("getForecastByGroup requires tenantId");
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<{ target_year: number; target_month: number; group_pt: string; predicted_total: number; lower_bound: number; upper_bound: number }[]>`
            SELECT
              target_year,
              target_month,
              group_pt,
              SUM(predicted_amount)::float AS predicted_total,
              SUM(lower_bound)::float      AS lower_bound,
              SUM(upper_bound)::float      AS upper_bound
            FROM forecast_monthly_projection
            WHERE (target_year * 100 + target_month) > (${curYear} * 100 + ${curMonth})
            GROUP BY target_year, target_month, group_pt
            ORDER BY target_year, target_month, group_pt
          `;
          return rows.map((r) => ({
            target_year: Number(r.target_year),
            target_month: Number(r.target_month),
            group_pt: r.group_pt,
            predicted_total: Number(r.predicted_total),
            lower_bound: Number(r.lower_bound),
            upper_bound: Number(r.upper_bound),
          }));
        });
      },

      async getRealSpendingByCategory(months: number): Promise<RealSpendingByCategory[]> {
        if (!tid) throw new Error("getRealSpendingByCategory requires tenantId");
        const now = new Date();
        const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
        const cutoffYear = cutoff.getFullYear();
        const cutoffMonth = cutoff.getMonth() + 1;
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<{ year: number; month: number; category_pt: string; group_pt: string; total_gastos: number }[]>`
            SELECT year, month, category_pt, group_pt, SUM(total_gastos) AS total_gastos
            FROM cube_gastos_mensais
            WHERE (year * 100 + month) BETWEEN (${cutoffYear} * 100 + ${cutoffMonth}) AND (${curYear} * 100 + ${curMonth})
            GROUP BY year, month, category_pt, group_pt
            ORDER BY year, month, group_pt, category_pt
          `;
          return rows.map((r) => ({
            year: Number(r.year),
            month: Number(r.month),
            category_pt: r.category_pt,
            group_pt: r.group_pt,
            total_gastos: Number(r.total_gastos),
          }));
        });
      },

      async getForecastByCategory(): Promise<ForecastByCategory[]> {
        if (!tid) throw new Error("getForecastByCategory requires tenantId");
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<{ target_year: number; target_month: number; category_pt: string; group_pt: string; predicted_amount: number; lower_bound: number; upper_bound: number }[]>`
            SELECT
              target_year,
              target_month,
              category_pt,
              group_pt,
              predicted_amount::float AS predicted_amount,
              lower_bound::float      AS lower_bound,
              upper_bound::float      AS upper_bound
            FROM forecast_monthly_projection
            WHERE (target_year * 100 + target_month) > (${curYear} * 100 + ${curMonth})
            ORDER BY target_year, target_month, group_pt, category_pt
          `;
          return rows.map((r) => ({
            target_year: Number(r.target_year),
            target_month: Number(r.target_month),
            category_pt: r.category_pt,
            group_pt: r.group_pt,
            predicted_total: Number(r.predicted_amount),
            lower_bound: Number(r.lower_bound),
            upper_bound: Number(r.upper_bound),
          }));
        });
      },

      async getTodayMessage(): Promise<ForecastAiMessage | null> {
        if (!tid) throw new Error("getTodayMessage requires tenantId");
        const today = new Date().toISOString().slice(0, 10);
        const rows = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<ForecastAiMessage[]>`
            SELECT tenant_id, message_date::text, message_pt, context_json, model_version, created_at::text
            FROM forecast_ai_messages
            WHERE message_date = ${today}::date
            LIMIT 1
          `;
        });
        return rows[0] ?? null;
      },

      async getDailyInsight(date: string): Promise<DailyInsightMessage | null> {
        if (!tid) throw new Error("getDailyInsight requires tenantId");
        const rows = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<DailyInsightMessage[]>`
            SELECT tenant_id, message_date::text, message_pt, context_json, model_version,
                   COALESCE(message_type, 'daily_insight') AS insight_type, created_at::text
            FROM forecast_ai_messages
            WHERE message_date = ${date}::date
              AND message_type = 'daily_insight'
            LIMIT 1
          `;
        });
        const row = rows[0];
        if (!row) return null;
        return {
          ...row,
          context_json: parseJsonbField<Record<string, unknown>>(row.context_json) ?? {},
        };
      },

      async getDailyHabitSignals(date: string): Promise<DailyHabitSignal[]> {
        if (!tid) throw new Error("getDailyHabitSignals requires tenantId");
        const d = new Date(date);
        const dayOfWeek = d.getUTCDay();
        const dayOfMonth = d.getUTCDate();
        const rows = await sql<{ day_of_week: number; day_of_month: number; category_pt: string; group_pt: string; occurrences: string; avg_amount: string; std_amount: string | null; occurrences_6m: string }[]>`
          SELECT day_of_week, day_of_month, category_pt, group_pt,
                 occurrences, avg_amount, std_amount, occurrences_6m
          FROM daily_habit_signals
          WHERE tenant_id = ${tid}::uuid
            AND (day_of_week = ${dayOfWeek} OR day_of_month = ${dayOfMonth})
        `;
        return rows.map(r => ({
          day_of_week: Number(r.day_of_week),
          day_of_month: Number(r.day_of_month),
          category_pt: r.category_pt,
          group_pt: r.group_pt,
          occurrences: Number(r.occurrences),
          avg_amount: Number(r.avg_amount),
          std_amount: r.std_amount !== null ? Number(r.std_amount) : null,
          occurrences_6m: Number(r.occurrences_6m),
        }));
      },

      async getDailyPrediction(date: string): Promise<DailyPrediction[]> {
        if (!tid) throw new Error("getDailyPrediction requires tenantId");
        const d = new Date(date);
        const dayOfWeek = d.getUTCDay();
        const dayOfMonth = d.getUTCDate();
        const rows = await sql<{ category_pt: string; group_pt: string; avg_amount: string; std_amount: string | null; occurrences_6m: string; max_occurrences_6m: string }[]>`
          SELECT
            category_pt,
            group_pt,
            avg_amount,
            std_amount,
            occurrences_6m,
            MAX(occurrences_6m) OVER (PARTITION BY tenant_id) AS max_occurrences_6m
          FROM daily_habit_signals
          WHERE tenant_id = ${tid}::uuid
            AND (day_of_week = ${dayOfWeek} OR day_of_month = ${dayOfMonth})
          ORDER BY occurrences_6m DESC
        `;
        return rows.map(r => {
          const avg = Number(r.avg_amount);
          const std = r.std_amount !== null ? Number(r.std_amount) : 0;
          const occ6m = Number(r.occurrences_6m);
          const maxOcc6m = Number(r.max_occurrences_6m);
          return {
            prediction_date: date,
            category_pt: r.category_pt,
            group_pt: r.group_pt,
            predicted_amount: avg,
            lower_bound: Math.max(0, avg - std),
            upper_bound: avg + std,
            probability: maxOcc6m > 0 ? occ6m / maxOcc6m : 0,
            model_version: 'sql-view',
          };
        });
      },

      async saveDailyInsightMessage(
        date: string,
        message: string,
        contextJson: Record<string, unknown>,
        modelVersion: string,
        insightType: string,
      ): Promise<void> {
        if (!tid) throw new Error("saveDailyInsightMessage requires tenantId");
        await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`
            INSERT INTO forecast_ai_messages (tenant_id, message_date, message_pt, context_json, model_version, message_type)
            VALUES (${tid}::uuid, ${date}::date, ${message}, ${JSON.stringify(contextJson)}::jsonb, ${modelVersion}, ${insightType})
            ON CONFLICT (tenant_id, message_date, message_type) DO UPDATE SET
              message_pt    = EXCLUDED.message_pt,
              context_json  = EXCLUDED.context_json,
              model_version = EXCLUDED.model_version,
              created_at    = NOW()
          `;
        });
      },
    };

    // ── users ─────────────────────────────────────────────────────────────────
    this.users = {
      async getAll() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<{ id: number; name: string; display_name: string }[]>`
            SELECT id, name, display_name FROM tenant_members ORDER BY id
          `;
        });
      },
      async updateDisplayName(id: number, displayName: string) {
        const trimmed = displayName.trim();
        if (!trimmed || trimmed.length > 50) return null;
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<{ id: number; name: string; display_name: string }[]>`
            UPDATE tenant_members SET display_name = ${trimmed} WHERE id = ${id}
            RETURNING id, name, display_name
          `;
          return rows[0] ?? null;
        });
      },
    };

    // ── goals ─────────────────────────────────────────────────────────────────
    this.goals = {
      async getAll() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<GoalProgressRow[]>`
            SELECT id, tenant_id, name, goal_type, target_amount::float8 AS target_amount,
                   current_amount::float8 AS current_amount, category_group, deadline::text AS deadline, status,
                   notes, created_at::text AS created_at, progress_ratio::float8 AS progress_ratio,
                   progress_pct::float8 AS progress_pct,
                   days_remaining, is_overdue
            FROM goals_progress_view
            ORDER BY deadline ASC NULLS LAST, created_at ASC
          `;
          return rows;
        });
      },
      async create(data) {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<GoalRow[]>`
            INSERT INTO financial_goals (tenant_id, name, goal_type, target_amount, current_amount, category_group, deadline, status, notes)
            VALUES (
              ${tid}::uuid, ${data.name}, ${data.goal_type},
              ${data.target_amount}, ${data.current_amount ?? 0},
              ${data.category_group ?? null}, ${data.deadline ?? null},
              ${data.status ?? 'active'}, ${data.notes ?? null}
            )
            RETURNING id, tenant_id, name, goal_type, target_amount::float8 AS target_amount,
                      current_amount::float8 AS current_amount, category_group, deadline::text AS deadline, status,
                      notes, created_at::text AS created_at
          `;
          return rows[0]!;
        });
      },
      async update(id, data) {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const sets: string[] = [];
          const vals: unknown[] = [];
          if (data.name !== undefined)           { sets.push(`name = $${sets.length + 1}`);           vals.push(data.name); }
          if (data.current_amount !== undefined) { sets.push(`current_amount = $${sets.length + 1}`); vals.push(data.current_amount); }
          if (data.target_amount !== undefined)  { sets.push(`target_amount = $${sets.length + 1}`);  vals.push(data.target_amount); }
          if (data.deadline !== undefined)       { sets.push(`deadline = $${sets.length + 1}`);       vals.push(data.deadline); }
          if (data.status !== undefined)         { sets.push(`status = $${sets.length + 1}`);         vals.push(data.status); }
          if (data.notes !== undefined)          { sets.push(`notes = $${sets.length + 1}`);          vals.push(data.notes); }
          if (sets.length === 0) {
            const rows = await tx<GoalRow[]>`
              SELECT id, tenant_id, name, goal_type, target_amount::float8 AS target_amount,
                     current_amount::float8 AS current_amount, category_group, deadline::text AS deadline, status,
                     notes, created_at::text AS created_at
              FROM financial_goals WHERE id = ${id}
            `;
            return rows[0] ?? null;
          }
          vals.push(id);
          const query = `UPDATE financial_goals SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING id, tenant_id, name, goal_type, target_amount::float8 AS target_amount, current_amount::float8 AS current_amount, category_group, deadline::text AS deadline, status, notes, created_at::text AS created_at`;
          const rows = await tx.unsafe(query, vals as string[]) as GoalRow[];
          return rows[0] ?? null;
        });
      },
      async remove(id) {
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`DELETE FROM financial_goals WHERE id = ${id}`;
        });
      },
      async getActiveForDigest() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<GoalProgressRow[]>`
            SELECT id, tenant_id, name, goal_type, target_amount::float8 AS target_amount,
                   current_amount::float8 AS current_amount, category_group, deadline::text AS deadline, status,
                   notes, created_at::text AS created_at, progress_ratio::float8 AS progress_ratio,
                   progress_pct::float8 AS progress_pct,
                   days_remaining, is_overdue
            FROM goals_progress_view
            ORDER BY deadline ASC NULLS LAST, created_at ASC
            LIMIT 5
          `;
          return rows;
        });
      },
    };

    // ── budgets ───────────────────────────────────────────────────────────────
    this.budgets = {
      async getAll() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<BudgetExecutionRow[]>`
            SELECT id, tenant_id, category_pt,
                   monthly_limit::float8 AS monthly_limit,
                   spent_amount::float8 AS spent_amount,
                   remaining::float8 AS remaining,
                   used_ratio::float8 AS used_ratio,
                   budget_status, is_active,
                   created_at::text AS created_at
            FROM budget_execution_view
            ORDER BY category_pt ASC
          `;
          return rows;
        });
      },
      async upsert(data) {
        if (!tid) throw new Error("upsert de orçamento requer tenantId");
        const rows = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<BudgetRow[]>`
            INSERT INTO category_budgets (tenant_id, category_pt, monthly_limit)
            VALUES (${tid}::uuid, ${data.category_pt}, ${data.monthly_limit})
            ON CONFLICT (tenant_id, category_pt) DO UPDATE
              SET monthly_limit = EXCLUDED.monthly_limit, is_active = true
            RETURNING id, tenant_id, category_pt,
                      monthly_limit::float8 AS monthly_limit,
                      is_active, created_at::text AS created_at
          `;
        });
        return rows[0]!;
      },
      async remove(id) {
        await sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          await tx`DELETE FROM category_budgets WHERE id = ${id}`;
        });
      },
      async getExceededOrWarning() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const rows = await tx<BudgetExecutionRow[]>`
            SELECT id, tenant_id, category_pt,
                   monthly_limit::float8 AS monthly_limit,
                   spent_amount::float8 AS spent_amount,
                   remaining::float8 AS remaining,
                   used_ratio::float8 AS used_ratio,
                   budget_status, is_active,
                   created_at::text AS created_at
            FROM budget_execution_view
            WHERE budget_status IN ('exceeded', 'warning')
            ORDER BY used_ratio DESC
          `;
          return rows;
        });
      },
    };

    // ── workers ───────────────────────────────────────────────────────────────
    this.workers = {
      async create(data) {
        const rows = await sql<WorkerRow[]>`
          INSERT INTO workers (name, ai_base_url, ai_api_key, ai_model)
          VALUES (${data.name}, ${data.ai_base_url}, ${data.ai_api_key ?? null}, ${data.ai_model})
          RETURNING id, name, ai_base_url, ai_api_key, ai_model, status, error_count,
                    last_error, jobs_done, last_seen_at, created_at
        `;
        return rows[0]!;
      },
      async findAll() {
        return sql<WorkerRow[]>`
          SELECT
            w.id, w.name, w.ai_base_url, w.ai_api_key, w.ai_model, w.status,
            w.error_count, w.last_error, w.jobs_done, w.last_seen_at, w.created_at,
            AVG(EXTRACT(EPOCH FROM (j7.finished_at - j7.started_at)))
              AS avg_duration_7d_secs,
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (j7.finished_at - j7.started_at))
            ) AS median_duration_7d_secs,
            AVG(EXTRACT(EPOCH FROM (jall.finished_at - jall.started_at)))
              AS avg_duration_all_secs,
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (jall.finished_at - jall.started_at))
            ) AS median_duration_all_secs
          FROM workers w
          LEFT JOIN enrich_jobs j7
            ON j7.worker_id = w.id
            AND j7.status = 'done'
            AND j7.finished_at IS NOT NULL
            AND j7.started_at IS NOT NULL
            AND j7.finished_at >= NOW() - INTERVAL '7 days'
          LEFT JOIN enrich_jobs jall
            ON jall.worker_id = w.id
            AND jall.status = 'done'
            AND jall.finished_at IS NOT NULL
            AND jall.started_at IS NOT NULL
          GROUP BY w.id
          ORDER BY w.created_at ASC
        `;
      },
      async findActive() {
        return sql<WorkerRow[]>`
          SELECT id, name, ai_base_url, ai_api_key, ai_model, kind, status, error_count,
                 last_error, jobs_done, last_seen_at, created_at
          FROM workers
          WHERE status IN ('idle', 'busy')
          ORDER BY created_at ASC
        `;
      },
      async update(id, data) {
        return sql.begin(async (tx) => {
          if (data.name !== undefined)         await tx`UPDATE workers SET name        = ${data.name}                   WHERE id = ${id}::uuid`;
          if (data.ai_base_url !== undefined)  await tx`UPDATE workers SET ai_base_url = ${data.ai_base_url}            WHERE id = ${id}::uuid`;
          if (data.ai_api_key !== undefined)   await tx`UPDATE workers SET ai_api_key  = ${data.ai_api_key}             WHERE id = ${id}::uuid`;
          if (data.ai_model !== undefined)     await tx`UPDATE workers SET ai_model    = ${data.ai_model}               WHERE id = ${id}::uuid`;
          if (data.status !== undefined)       await tx`UPDATE workers SET status      = ${data.status}                 WHERE id = ${id}::uuid`;
          if (data.error_count !== undefined)  await tx`UPDATE workers SET error_count = ${data.error_count}            WHERE id = ${id}::uuid`;
          if (data.last_error !== undefined)   await tx`UPDATE workers SET last_error  = ${data.last_error}             WHERE id = ${id}::uuid`;
          if (data.last_seen_at !== undefined) await tx`UPDATE workers SET last_seen_at = ${data.last_seen_at}::timestamp WHERE id = ${id}::uuid`;
          const rows = await tx<WorkerRow[]>`
            SELECT id, name, ai_base_url, ai_api_key, ai_model, status, error_count,
                   last_error, jobs_done, last_seen_at, created_at
            FROM workers WHERE id = ${id}::uuid LIMIT 1
          `;
          return rows[0] ?? null;
        });
      },
      async remove(id) {
        const rows = await sql`DELETE FROM workers WHERE id = ${id}::uuid RETURNING id`;
        return rows.length > 0;
      },
    };

    // ── tenants ───────────────────────────────────────────────────────────────
    this.tenants = {
      async findAll() {
        return sql<TenantRow[]>`
          SELECT id, name, email, status, created_at, last_login_at
          FROM tenants
          ORDER BY last_login_at DESC NULLS LAST
        `;
      },
      async create(data) {
        const rows = await sql<TenantRow[]>`
          INSERT INTO tenants (name, email, password_hash, pluggy_email, pluggy_password)
          VALUES (${data.name}, ${data.email}, ${data.password_hash},
                  ${data.pluggy_email ?? null}, ${data.pluggy_password ?? null})
          RETURNING id, name, email, status, created_at, last_login_at
        `;
        return rows[0]!;
      },
      async setStatus(id, status) {
        const rows = await sql<TenantRow[]>`
          UPDATE tenants
          SET status = ${status}
          WHERE id = ${id}::uuid
          RETURNING id, name, email, status, created_at, last_login_at
        `;
        return rows[0] ?? null;
      },
    };

    // ── enrich_jobs ───────────────────────────────────────────────────────────
    this.enrich_jobs = {
      async enqueue(tenantId: string, _transactionIds: string[]): Promise<number> {
        const result = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
          return tx`
            INSERT INTO enrich_jobs (tenant_id, transaction_id, date)
            SELECT t.tenant_id, t.id, t.date
            FROM transactions t
            WHERE t.tenant_id = ${tenantId}::uuid
              AND NOT EXISTS (
                SELECT 1 FROM ai_transaction_insights ai WHERE ai.transaction_id = t.id
              )
            ON CONFLICT (transaction_id) DO NOTHING
            RETURNING id
          `;
        });
        return result.length;
      },

      async nextJob(workerId: string): Promise<EnrichJob | null> {
        const rows = await sql<EnrichJob[]>`
          WITH rnd_tenant AS (
            SELECT tenant_id FROM enrich_jobs
            WHERE status = 'pending'
            GROUP BY tenant_id
            ORDER BY RANDOM() LIMIT 1
          ),
          next AS (
            SELECT id, transaction_id, tenant_id, date
            FROM enrich_jobs
            WHERE status = 'pending'
              AND tenant_id = (SELECT tenant_id FROM rnd_tenant)
            ORDER BY date DESC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE enrich_jobs SET
            status = 'running',
            worker_id = ${workerId}::uuid,
            started_at = NOW(),
            attempts = attempts + 1
          FROM next
          WHERE enrich_jobs.id = next.id
          RETURNING enrich_jobs.id, enrich_jobs.tenant_id, enrich_jobs.transaction_id,
                    enrich_jobs.date, enrich_jobs.status, enrich_jobs.attempts, enrich_jobs.worker_id
        `;
        return rows[0] ?? null;
      },

      async markDone(jobId: number, workerId: string): Promise<void> {
        await sql.begin(async (tx) => {
          await tx`
            UPDATE enrich_jobs
            SET status = 'done', finished_at = NOW()
            WHERE id = ${jobId}
          `;
          await tx`
            UPDATE workers
            SET jobs_done = jobs_done + 1, last_seen_at = NOW()
            WHERE id = ${workerId}::uuid
          `;
        });
      },

      async markError(jobId: number, error: string): Promise<void> {
        await sql`
          UPDATE enrich_jobs
          SET
            error_msg = ${error},
            status = CASE WHEN attempts >= 3 THEN 'error' ELSE 'pending' END,
            started_at = NULL,
            worker_id = NULL
          WHERE id = ${jobId}
        `;
      },

      async releaseStuck(): Promise<void> {
        await sql`
          UPDATE enrich_jobs
          SET status = 'pending', started_at = NULL, worker_id = NULL
          WHERE status = 'running'
            AND started_at < NOW() - INTERVAL '10 minutes'
        `;
      },

      async getQueueStats(): Promise<QueueStats> {
        // Query 1: counts by status
        const countRows = await sql<{ status: string; cnt: string }[]>`
          SELECT status, COUNT(*) AS cnt FROM enrich_jobs GROUP BY status
        `;
        const counts: Record<string, number> = {};
        for (const r of countRows) counts[r.status] = parseInt(r.cnt, 10);
        const pending = counts['pending'] ?? 0;
        const running = counts['running'] ?? 0;
        const done = counts['done'] ?? 0;
        const error = counts['error'] ?? 0;
        const total = pending + running + done + error;
        const error_rate_current = total > 0 ? error / total : 0;
        const error_rate_historical = (done + error) > 0 ? error / (done + error) : 0;

        // Query 2: mediana por worker ativo com histórico
        const workerRows = await sql<{ median_secs: string }[]>`
          SELECT
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (j.finished_at - j.started_at))
            ) AS median_secs
          FROM workers w
          JOIN enrich_jobs j ON j.worker_id = w.id
            AND j.status = 'done'
            AND j.finished_at IS NOT NULL AND j.started_at IS NOT NULL
          WHERE w.status IN ('active', 'idle', 'busy')
          GROUP BY w.id
          HAVING COUNT(j.id) > 0
        `;

        if (workerRows.length > 0) {
          let throughput = 0;
          for (const r of workerRows) {
            const median = parseFloat(r.median_secs);
            if (median > 0) throughput += 1 / median;
          }
          const eta_seconds = throughput > 0 && pending > 0 ? Math.ceil(pending / throughput) : null;
          return { pending, running, done, error, total, error_rate_current, error_rate_historical,
            throughput_jobs_per_sec: throughput > 0 ? throughput : null, eta_seconds, throughput_source: 'workers' };
        }

        // Query 3 fallback: mediana global (7d)
        const globalRows = await sql<{ global_median_secs: string | null }[]>`
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (finished_at - started_at))
          ) AS global_median_secs
          FROM enrich_jobs
          WHERE status = 'done'
            AND finished_at IS NOT NULL AND started_at IS NOT NULL
            AND finished_at >= NOW() - INTERVAL '7 days'
        `;
        const globalMedian = globalRows[0]?.global_median_secs
          ? parseFloat(globalRows[0].global_median_secs) : null;

        if (globalMedian && globalMedian > 0) {
          const activeRows = await sql<{ cnt: string }[]>`
            SELECT COUNT(*) AS cnt FROM workers WHERE status IN ('active', 'idle', 'busy')
          `;
          const nActive = parseInt(activeRows[0]?.cnt ?? '0', 10);
          const throughput = nActive > 0 ? nActive / globalMedian : null;
          const eta_seconds = throughput && throughput > 0 && pending > 0
            ? Math.ceil(pending / throughput) : null;
          return { pending, running, done, error, total, error_rate_current, error_rate_historical,
            throughput_jobs_per_sec: throughput, eta_seconds, throughput_source: 'global' };
        }

        return { pending, running, done, error, total, error_rate_current, error_rate_historical,
          throughput_jobs_per_sec: null, eta_seconds: null, throughput_source: 'unavailable' };
      },
    };

    // ── digest_jobs ───────────────────────────────────────────────────────────
    this.digest_jobs = {
      async enqueue(tenants) {
        let inserted = 0;
        for (const t of tenants) {
          const rows = await sql`
            INSERT INTO digest_jobs (tenant_id, year, month)
            VALUES (${t.id}::uuid, ${t.year}, ${t.month})
            ON CONFLICT (tenant_id, year, month) DO NOTHING
            RETURNING id
          `;
          inserted += rows.length;
        }
        return inserted;
      },

      async nextJob(workerId) {
        const rows = await sql<DigestJob[]>`
          WITH next AS (
            SELECT id, tenant_id, year, month
            FROM digest_jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE digest_jobs SET
            status = 'running',
            worker_id = ${workerId}::uuid,
            started_at = NOW(),
            attempts = attempts + 1
          FROM next
          WHERE digest_jobs.id = next.id
          RETURNING digest_jobs.id, digest_jobs.tenant_id, digest_jobs.year, digest_jobs.month,
                    digest_jobs.status, digest_jobs.attempts, digest_jobs.worker_id
        `;
        return rows[0] ?? null;
      },

      async markDone(jobId) {
        await sql`
          UPDATE digest_jobs SET status = 'done', finished_at = NOW() WHERE id = ${jobId}
        `;
      },

      async markError(jobId, msg) {
        await sql`
          UPDATE digest_jobs SET
            error_msg = ${msg},
            status = CASE WHEN attempts >= 3 THEN 'error' ELSE 'pending' END,
            started_at = NULL, worker_id = NULL
          WHERE id = ${jobId}
        `;
      },

      async markSkipped(jobId) {
        await sql`
          UPDATE digest_jobs SET status = 'skipped', finished_at = NOW() WHERE id = ${jobId}
        `;
      },

      async releaseStuck() {
        await sql`
          UPDATE digest_jobs SET status = 'pending', started_at = NULL, worker_id = NULL
          WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes'
        `;
      },

      async getQueueStats() {
        const rows = await sql<{ status: string; cnt: string }[]>`
          SELECT status, COUNT(*) AS cnt FROM digest_jobs GROUP BY status
        `;
        const c: Record<string, number> = {};
        for (const r of rows) c[r.status] = parseInt(r.cnt, 10);
        return {
          pending: c['pending'] ?? 0,
          running: c['running'] ?? 0,
          done:    c['done']    ?? 0,
          error:   c['error']   ?? 0,
          skipped: c['skipped'] ?? 0,
        };
      },
    };

    // ── forecast_jobs ─────────────────────────────────────────────────────────
    this.forecast_jobs = {
      async enqueue(tenants, date) {
        let inserted = 0;
        for (const t of tenants) {
          const rows = await sql`
            INSERT INTO forecast_jobs (tenant_id, job_date)
            VALUES (${t.id}::uuid, ${date})
            ON CONFLICT (tenant_id, job_date) DO NOTHING
            RETURNING id
          `;
          inserted += rows.length;
        }
        return inserted;
      },

      async nextJob(workerId) {
        const rows = await sql<ForecastJob[]>`
          WITH next AS (
            SELECT id, tenant_id, job_date
            FROM forecast_jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE forecast_jobs SET
            status = 'running',
            worker_id = ${workerId}::uuid,
            started_at = NOW(),
            attempts = attempts + 1
          FROM next
          WHERE forecast_jobs.id = next.id
          RETURNING forecast_jobs.id, forecast_jobs.tenant_id, forecast_jobs.job_date,
                    forecast_jobs.status, forecast_jobs.attempts, forecast_jobs.worker_id
        `;
        return rows[0] ?? null;
      },

      async markDone(jobId) {
        await sql`
          UPDATE forecast_jobs SET status = 'done', finished_at = NOW() WHERE id = ${jobId}
        `;
      },

      async markError(jobId, msg) {
        await sql`
          UPDATE forecast_jobs SET
            error_msg = ${msg},
            status = CASE WHEN attempts >= 3 THEN 'error' ELSE 'pending' END,
            started_at = NULL, worker_id = NULL
          WHERE id = ${jobId}
        `;
      },

      async releaseStuck() {
        await sql`
          UPDATE forecast_jobs SET status = 'pending', started_at = NULL, worker_id = NULL
          WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes'
        `;
      },

      async getQueueStats() {
        const rows = await sql<{ status: string; cnt: string }[]>`
          SELECT status, COUNT(*) AS cnt FROM forecast_jobs GROUP BY status
        `;
        const c: Record<string, number> = {};
        for (const r of rows) c[r.status] = parseInt(r.cnt, 10);
        return {
          pending: c['pending'] ?? 0,
          running: c['running'] ?? 0,
          done:    c['done']    ?? 0,
          error:   c['error']   ?? 0,
        };
      },
    };

    // ── categoryRules ─────────────────────────────────────────────────────────
    this.categoryRules = {
      async list() {
        return sql.begin(async (tx) => {
          if (tid) await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<CategoryRuleRow[]>`
            SELECT co.id, co.tenant_id, co.pattern,
                   co.category_id_override, cl.name_pt AS category_pt,
                   co.note, co.priority, co.match_count, co.is_active,
                   co.created_at
            FROM category_overrides co
            LEFT JOIN category_labels cl ON cl.category_id = co.category_id_override
            ORDER BY co.priority ASC, co.id ASC
          `;
        });
      },

      async create(value: string, categoryId: string, note?: string) {
        if (!tid) throw new Error("categoryRules.create requer tenantId");
        const pattern = `%${value}%`;
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const maxRows = await tx<[{ max_priority: number | null }]>`
            SELECT MAX(priority) AS max_priority FROM category_overrides
          `;
          const nextPriority = (maxRows[0]?.max_priority ?? 0) + 10;
          const rows = await tx<CategoryRuleRow[]>`
            INSERT INTO category_overrides (tenant_id, pattern, category_id_override, note, priority)
            VALUES (${tid}::uuid, ${pattern}, ${categoryId}, ${note ?? null}, ${nextPriority})
            RETURNING id, tenant_id, pattern, category_id_override,
                      null::text AS category_pt,
                      note, priority, match_count, is_active, created_at
          `;
          const rule = rows[0]!;
          // fetch category_pt
          const clRows = await tx<[{ name_pt: string }]>`
            SELECT name_pt FROM category_labels WHERE category_id = ${categoryId} LIMIT 1
          `;
          return { ...rule, category_pt: clRows[0]?.name_pt ?? null };
        });
      },

      async update(id: number, fields: Partial<{ value: string; category_id: string; note: string; is_active: boolean }>) {
        if (!tid) throw new Error("categoryRules.update requer tenantId");
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const existing = await tx<CategoryRuleRow[]>`
            SELECT id FROM category_overrides WHERE id = ${id} LIMIT 1
          `;
          if (!existing[0]) return null;

          if (fields.value !== undefined) {
            await tx`UPDATE category_overrides SET pattern = ${`%${fields.value}%`} WHERE id = ${id}`;
          }
          if (fields.category_id !== undefined) {
            await tx`UPDATE category_overrides SET category_id_override = ${fields.category_id} WHERE id = ${id}`;
          }
          if (fields.note !== undefined) {
            await tx`UPDATE category_overrides SET note = ${fields.note} WHERE id = ${id}`;
          }
          if (fields.is_active !== undefined) {
            await tx`UPDATE category_overrides SET is_active = ${fields.is_active} WHERE id = ${id}`;
          }

          const rows = await tx<CategoryRuleRow[]>`
            SELECT co.id, co.tenant_id, co.pattern,
                   co.category_id_override, cl.name_pt AS category_pt,
                   co.note, co.priority, co.match_count, co.is_active, co.created_at
            FROM category_overrides co
            LEFT JOIN category_labels cl ON cl.category_id = co.category_id_override
            WHERE co.id = ${id}
          `;
          return rows[0] ?? null;
        });
      },

      async remove(id: number) {
        if (!tid) throw new Error("categoryRules.remove requer tenantId");
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const result = await tx<[{ id: number }]>`
            DELETE FROM category_overrides WHERE id = ${id}
            RETURNING id
          `;
          return result.length > 0;
        });
      },

      async reorder(id: number, direction: 'up' | 'down') {
        if (!tid) throw new Error("categoryRules.reorder requer tenantId");
        await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const current = await tx<[{ priority: number }]>`
            SELECT priority FROM category_overrides WHERE id = ${id} LIMIT 1
          `;
          if (!current[0]) return;
          const curPriority = current[0].priority;

          const neighborRows = direction === 'up'
            ? await tx<[{ id: number; priority: number }]>`
                SELECT id, priority FROM category_overrides
                WHERE priority < ${curPriority}
                ORDER BY priority DESC LIMIT 1
              `
            : await tx<[{ id: number; priority: number }]>`
                SELECT id, priority FROM category_overrides
                WHERE priority > ${curPriority}
                ORDER BY priority ASC LIMIT 1
              `;
          if (!neighborRows[0]) return;
          const neighbor = neighborRows[0];

          await tx`UPDATE category_overrides SET priority = ${neighbor.priority} WHERE id = ${id}`;
          await tx`UPDATE category_overrides SET priority = ${curPriority} WHERE id = ${neighbor.id}`;
        });
      },

      async applyToHistory(id: number): Promise<number> {
        if (!tid) throw new Error("categoryRules.applyToHistory requer tenantId");
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          const ruleRows = await tx<[{ pattern: string; category_id_override: string }]>`
            SELECT pattern, category_id_override FROM category_overrides WHERE id = ${id} LIMIT 1
          `;
          if (!ruleRows[0]) return 0;
          const { pattern, category_id_override } = ruleRows[0];

          const clRows = await tx<[{ name_pt: string; group_id: string; group_name_pt: string }]>`
            SELECT cl.name_pt, cl.category_id AS group_id, cg.name_pt AS group_name_pt
            FROM category_labels cl
            LEFT JOIN category_groups cg ON cg.group_id = LEFT(cl.category_id, 2)
            WHERE cl.category_id = ${category_id_override} LIMIT 1
          `;
          if (!clRows[0]) return 0;
          const { name_pt, group_id, group_name_pt } = clRows[0];
          const groupId = group_id ? group_id.slice(0, 2) : null;

          const result = await tx<[{ count: string }]>`
            WITH updated AS (
              UPDATE transactions_enriched
              SET
                category_id       = ${category_id_override},
                category_pt       = ${name_pt},
                category_group    = ${groupId},
                category_group_pt = ${group_name_pt}
              WHERE description ILIKE ${pattern}
              RETURNING id
            )
            SELECT COUNT(*) AS count FROM updated
          `;
          const affected = parseInt(result[0]?.count ?? "0", 10);
          if (affected > 0) {
            await tx`
              UPDATE category_overrides
              SET match_count = match_count + ${affected}
              WHERE id = ${id}
            `;
          }
          return affected;
        });
      },
    };

    // ── categories ────────────────────────────────────────────────────────────
    this.categories = {
      async list() {
        const rows = await sql<CategoryLabelRow[]>`
          SELECT cl.category_id, cl.name_pt, cg.group_id, cg.name_pt AS group_name_pt
          FROM category_labels cl
          LEFT JOIN category_groups cg ON cg.group_id = LEFT(cl.category_id, 2)
          ORDER BY cg.group_id ASC, cl.category_id ASC
        `;
        return rows;
      },
    };

    // ── transactionCategory ───────────────────────────────────────────────────
    this.transactionCategory = {
      async override(transactionId: string, categoryId: string): Promise<boolean> {
        if (!tid) throw new Error("transactionCategory.override requer tenantId");
        return sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          // Check if transaction belongs to tenant
          const check = await tx<[{ id: string }]>`
            SELECT id FROM transactions_enriched WHERE id = ${transactionId} LIMIT 1
          `;
          if (!check[0]) return false;

          const clRows = await tx<[{ name_pt: string }]>`
            SELECT name_pt FROM category_labels WHERE category_id = ${categoryId} LIMIT 1
          `;
          if (!clRows[0]) return false;
          const name_pt = clRows[0].name_pt;
          const groupId = categoryId.slice(0, 2);
          const cgRows = await tx<[{ name_pt: string }]>`
            SELECT name_pt FROM category_groups WHERE group_id = ${groupId} LIMIT 1
          `;
          const group_name_pt = cgRows[0]?.name_pt ?? null;

          // Update transactions_enriched
          await tx`
            UPDATE transactions_enriched
            SET
              category_id       = ${categoryId},
              category_pt       = ${name_pt},
              category_group    = ${groupId},
              category_group_pt = ${group_name_pt}
            WHERE id = ${transactionId}
          `;

          // Upsert transaction_category_overrides for auditability
          await tx`
            INSERT INTO transaction_category_overrides (transaction_id, tenant_id, category_id)
            VALUES (${transactionId}, ${tid}::uuid, ${categoryId})
            ON CONFLICT (transaction_id, tenant_id) DO UPDATE
              SET category_id = EXCLUDED.category_id, overridden_at = NOW()
          `;
          return true;
        });
      },

      async countByDescriptionLike(text: string): Promise<number> {
        if (!tid) throw new Error("transactionCategory.countByDescriptionLike requer tenantId");
        const rows = await sql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tid}, true)`;
          return tx<[{ count: string }]>`
            SELECT COUNT(*) AS count
            FROM transactions_enriched
            WHERE description ILIKE ${`%${text}%`}
          `;
        });
        return parseInt(rows[0]?.count ?? "0", 10);
      },
    };

  }

  // ── web dashboard queries ─────────────────────────────────────────────────

  private withTenant<T>(fn: (q: SQL) => Promise<T>): Promise<T> {
    if (!this.tenantId) return fn(this.sql);
    return this.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${this.tenantId!}, true)`;
      return fn(tx);
    });
  }

  async getCashflowMensal(year: number, month: number) {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          year: number; month: number; month_name_pt: string;
          total_receitas: string | null; total_despesas: string | null; saldo_liquido: string | null;
          num_receitas: string; num_despesas: string;
          total_emprestimos: string | null; total_receitas_operacionais: string | null;
        }[]
      >`
        SELECT year, month, month_name_pt,
               total_receitas, total_despesas, saldo_liquido,
               num_receitas, num_despesas,
               total_emprestimos, total_receitas_operacionais
        FROM cube_cashflow_mensal
        WHERE year = ${year} AND month = ${month}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        year: row.year, month: row.month, month_name_pt: row.month_name_pt,
        total_receitas: Number(row.total_receitas ?? 0),
        total_despesas: Number(row.total_despesas ?? 0),
        saldo_liquido:  Number(row.saldo_liquido  ?? 0),
        num_receitas:   parseInt(row.num_receitas, 10),
        num_despesas:   parseInt(row.num_despesas, 10),
        total_emprestimos: row.total_emprestimos !== null ? Number(row.total_emprestimos) : undefined,
        total_receitas_operacionais: row.total_receitas_operacionais !== null ? Number(row.total_receitas_operacionais) : undefined,
      };
    });
  }

  async getGastosMensais(year: number, month: number) {
    return this.withTenant(async (q) => {
      const grupos = await q<{ group_pt: string; num_transacoes: number; total_gastos: string; ticket_medio: string }[]>`
        SELECT group_pt, num_transacoes, total_gastos, ticket_medio
        FROM cube_gastos_grupo_mensal
        WHERE year = ${year} AND month = ${month}
        ORDER BY total_gastos DESC
      `;
      const categorias = await q<{ group_pt: string; category_pt: string; num_transacoes: number; total_gastos: string; ticket_medio: string }[]>`
        SELECT group_pt, category_pt, num_transacoes, total_gastos, ticket_medio
        FROM cube_gastos_categoria_mensal
        WHERE year = ${year} AND month = ${month}
        ORDER BY total_gastos DESC
      `;
      const novos = await q<{ group_pt: string; category_pt: string; display_name: string; num_transacoes: number; total_gastos: string }[]>`
        SELECT group_pt, category_pt, display_name, num_transacoes, total_gastos
        FROM cube_gastos_novos
        WHERE year = ${year} AND month = ${month}
        ORDER BY total_gastos DESC
      `;
      return {
        grupos:     grupos.map(r => ({ ...r, total_gastos: Number(r.total_gastos), ticket_medio: Number(r.ticket_medio) })),
        categorias: categorias.map(r => ({ ...r, total_gastos: Number(r.total_gastos), ticket_medio: Number(r.ticket_medio) })),
        novos:      novos.map(r => ({ ...r, total_gastos: Number(r.total_gastos) })),
      };
    });
  }

  async getCompromissosAtivos() {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          description: string; purchase_day: string; amount: string;
          account_id: string; cartao: string; dono: string;
          category_pt: string | null; category_group_pt: string | null;
          installment_atual: number; total_installments: number; compromisso_restante: string;
        }[]
      >`
        SELECT description, purchase_day, amount, account_id, cartao, dono,
               category_pt, category_group_pt,
               installment_atual, total_installments, compromisso_restante
        FROM cube_compromissos_ativos
        ORDER BY compromisso_restante DESC
      `;
      return rows.map(r => ({
        ...r,
        amount: Number(r.amount),
        compromisso_restante: Number(r.compromisso_restante),
      }));
    });
  }

  async getCashflowProjetado() {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          year: number; month: number; month_name_pt: string | null;
          total_receitas: string | null; total_despesas: string | null;
          saldo_liquido: string | null; is_projected: boolean;
        }[]
      >`
        SELECT year, month, month_name_pt, total_receitas, total_despesas, saldo_liquido, is_projected
        FROM cube_cashflow_projetado
        ORDER BY year, month ASC
      `;
      return rows.map(r => ({
        year: r.year, month: r.month, month_name_pt: r.month_name_pt,
        total_receitas: r.total_receitas !== null ? Number(r.total_receitas) : null,
        total_despesas: r.total_despesas !== null ? Number(r.total_despesas) : null,
        saldo_liquido:  r.saldo_liquido  !== null ? Number(r.saldo_liquido)  : null,
        is_projected: r.is_projected,
      }));
    });
  }

  async getRunway() {
    return this.withTenant(async (q) => {
      const [imediato, total] = await Promise.all([
        q<{ saldo_liquido: string; media_saidas_90d: string | null; runway_imediato_meses: string | null }[]>`
          SELECT saldo_liquido, media_saidas_90d, runway_imediato_meses FROM kpi_runway_imediato LIMIT 1
        `,
        q<{ saldo_investimentos: string; runway_total_meses: string | null }[]>`
          SELECT saldo_investimentos, runway_total_meses FROM kpi_runway_total LIMIT 1
        `,
      ]);
      const rowI = imediato[0];
      const rowT = total[0];
      if (!rowI) return null;
      return {
        saldo_liquido:          Number(rowI.saldo_liquido),
        saldo_investimentos:    rowT ? Number(rowT.saldo_investimentos) : 0,
        media_saidas_90d:       rowI.media_saidas_90d !== null ? Number(rowI.media_saidas_90d) : null,
        runway_imediato_meses:  rowI.runway_imediato_meses !== null ? Number(rowI.runway_imediato_meses) : null,
        runway_total_meses:     rowT?.runway_total_meses !== null && rowT?.runway_total_meses !== undefined ? Number(rowT.runway_total_meses) : null,
      };
    });
  }

  async getPatrimonio() {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          account_id: string; nome: string; tipo: string; subtipo: string;
          banco: string | null; dono: string | null; moeda: string | null;
          saldo_atual: string | null; limite_credito: string | null; credito_disponivel: string | null;
        }[]
      >`
        SELECT account_id, nome, tipo, subtipo, banco, dono, moeda,
               saldo_atual, limite_credito, credito_disponivel
        FROM cube_patrimonio
      `;
      const items = rows.map(r => ({
        ...r,
        saldo_atual:         r.saldo_atual         !== null ? Number(r.saldo_atual)         : null,
        limite_credito:      r.limite_credito       !== null ? Number(r.limite_credito)      : null,
        credito_disponivel:  r.credito_disponivel   !== null ? Number(r.credito_disponivel)  : null,
      }));
      const total_patrimonio = items.reduce((sum, r) => {
        if (r.tipo === "BANK" || r.tipo === "SAVINGS") return sum + (r.saldo_atual ?? 0);
        return sum;
      }, 0);
      return { items, total_patrimonio: Math.round(total_patrimonio * 100) / 100 };
    });
  }

  async getInvestimentosMensais(months: number) {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          year: number; month: number; month_name_pt: string;
          investment_name: string; investment_type: string; investment_subtype: string | null;
          movement_type: string; num_movimentacoes: number; total_bruto: string; total_liquido: string;
        }[]
      >`
        SELECT year, month, month_name_pt, investment_name, investment_type, investment_subtype,
               movement_type, num_movimentacoes, total_bruto, total_liquido
        FROM cube_investimentos_mensal
        WHERE (year * 100 + month) >= (
          SELECT year * 100 + month FROM cube_investimentos_mensal ORDER BY year DESC, month DESC LIMIT 1 OFFSET ${months - 1}
        )
        ORDER BY year, month
      `;
      return rows.map(r => ({
        ...r,
        total_bruto:   Number(r.total_bruto),
        total_liquido: Number(r.total_liquido),
      }));
    });
  }

  async getDigestMensal(year: number, month: number) {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          year: number; month: number;
          cashflow_real: string | null; debt_inflows: string | null; debt_payments: string | null;
          narrative_pt: string | null; structured_summary: unknown | null;
          flags: string[] | null; notable_expenses: unknown | null;
          enrichment_coverage: string | null; model_version: string | null; digest_at: string;
        }[]
      >`
        SELECT year, month, cashflow_real, debt_inflows, debt_payments,
               narrative_pt, structured_summary, flags, notable_expenses,
               enrichment_coverage, model_version, digest_at
        FROM ai_monthly_digest
        WHERE year = ${year} AND month = ${month}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        ...row,
        cashflow_real:        row.cashflow_real        !== null ? Number(row.cashflow_real)        : null,
        debt_inflows:         row.debt_inflows         !== null ? Number(row.debt_inflows)         : null,
        debt_payments:        row.debt_payments        !== null ? Number(row.debt_payments)        : null,
        enrichment_coverage:  row.enrichment_coverage  !== null ? Number(row.enrichment_coverage)  : null,
        notable_expenses:     parseJsonbField(row.notable_expenses),
        structured_summary:   parseJsonbField(row.structured_summary),
      };
    });
  }

  async getTransacoesMensais(year: number, month: number, limit: number, offset: number) {
    return this.withTenant(async (q) => {
      const items = await q<
        {
          transaction_id: string; category_id: string | null; date_day: string; description: string;
          category_pt: string | null; category_group_pt: string | null;
          amount_signed: string; transaction_kind: string; owner_normalized: string;
          merchant_name: string | null; is_recurring: boolean | null;
          anomaly_score: string | null; tags: string[] | null;
        }[]
      >`
        SELECT t.transaction_id, t.category_id, t.date_day, t.description,
               t.category_pt, t.category_group_pt,
               t.amount_signed, t.transaction_kind, t.owner_normalized,
               ai.merchant_name, ai.is_recurring, ai.anomaly_score, ai.tags
        FROM f_transacoes t
        LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
        WHERE EXTRACT(YEAR  FROM t.date_day) = ${year}
          AND EXTRACT(MONTH FROM t.date_day) = ${month}
        ORDER BY t.date_day DESC, t.transaction_id
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countRows = await q<[{ count: string }]>`
        SELECT COUNT(*) AS count
        FROM f_transacoes
        WHERE EXTRACT(YEAR  FROM date_day) = ${year}
          AND EXTRACT(MONTH FROM date_day) = ${month}
      `;
      return {
        items: items.map(r => ({
          ...r,
          amount_signed:  Number(r.amount_signed),
          anomaly_score:  r.anomaly_score !== null ? Number(r.anomaly_score) : null,
        })),
        total: parseInt(countRows[0]?.count ?? "0", 10),
      };
    });
  }

  async getMesesDisponiveis(): Promise<string[]> {
    return this.withTenant(async (q) => {
      const rows = await q<{ year: number; month: number }[]>`
        SELECT DISTINCT year, month
        FROM cube_cashflow_mensal
        ORDER BY year DESC, month DESC
      `;
      return rows.map(r => `${r.year}-${String(r.month).padStart(2, "0")}`);
    });
  }

  async getTendencias() {
    return this.withTenant(async (q) => {
      const gruposRows = await q<{ nome: string; valor: string; meses_presentes: string }[]>`
        SELECT nome, valor, meses_presentes FROM cube_tendencias WHERE tipo = 'grupo' ORDER BY valor DESC
      `;
      const recorrentesRows = await q<{ merchant: string; nome: string; valor: string; meses_presentes: string; period: string | null }[]>`
        SELECT merchant, nome, valor, meses_presentes, period FROM cube_tendencias WHERE tipo = 'recorrente' ORDER BY valor DESC
      `;
      return {
        grupos: gruposRows.map(r => ({
          group_pt: r.nome,
          media_mensal: Number(r.valor),
          meses_presentes: parseInt(r.meses_presentes, 10),
        })),
        recorrentes: recorrentesRows.map(r => ({
          merchant_name: r.merchant,
          category_group_pt: r.nome,
          media_valor: Number(r.valor),
          ocorrencias: parseInt(r.meses_presentes, 10),
          recurrence_period: r.period,
        })),
      };
    });
  }

  async getDigestCoverage(year: number, month: number): Promise<{ total: number; enriched: number }> {
    return this.withTenant(async (q) => {
      const rows = await q<[{ total: string; enriched: string }]>`
        SELECT
          COUNT(*) AS total,
          COUNT(ai.transaction_id) AS enriched
        FROM f_transacoes t
        LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
        WHERE EXTRACT(YEAR  FROM t.date_day) = ${year}
          AND EXTRACT(MONTH FROM t.date_day) = ${month}
      `;
      const row = rows[0]!;
      return {
        total:    parseInt(row.total,    10),
        enriched: parseInt(row.enriched, 10),
      };
    });
  }

  async getEligibleMonthsForDigest(): Promise<{ year: number; month: number }[]> {
    const tenantId = this.tenantId;
    if (!tenantId) throw new Error("getEligibleMonthsForDigest requires a tenant context");
    return this.withTenant(async (q) => {
      const rows = await q<{ year: number; month: number }[]>`
        SELECT coverage.year, coverage.month
        FROM (
          SELECT
            EXTRACT(YEAR  FROM t.date_day)::int AS year,
            EXTRACT(MONTH FROM t.date_day)::int AS month,
            COUNT(ai.transaction_id) AS enriched,
            COUNT(*) AS total
          FROM f_transacoes t
          LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
          GROUP BY 1, 2
        ) coverage
        WHERE coverage.total > 0
          AND coverage.enriched::float / coverage.total >= 0.8
          AND NOT EXISTS (
            SELECT 1 FROM digest_jobs dj
            WHERE dj.tenant_id = ${tenantId}::uuid
              AND dj.year  = coverage.year
              AND dj.month = coverage.month
              AND dj.status IN ('done', 'pending', 'running')
          )
        ORDER BY coverage.year, coverage.month
      `;
      return rows.map((r) => ({ year: Number(r.year), month: Number(r.month) }));
    });
  }

  async getDigestData(year: number, month: number) {
    return this.withTenant(async (q) => {
      const rows = await q<
        {
          year: number; month: number;
          cashflow_real: string | null; debt_inflows: string | null; debt_payments: string | null;
          narrative_pt: string | null; structured_summary: unknown | null;
          flags: string[] | null; notable_expenses: unknown | null;
          enrichment_coverage: string | null; model_version: string | null; digest_at: string;
        }[]
      >`
        SELECT year, month, cashflow_real, debt_inflows, debt_payments,
               narrative_pt, structured_summary, flags, notable_expenses,
               enrichment_coverage, model_version, digest_at
        FROM ai_monthly_digest
        WHERE year = ${year} AND month = ${month}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        ...row,
        cashflow_real:       row.cashflow_real       !== null ? Number(row.cashflow_real)       : null,
        debt_inflows:        row.debt_inflows        !== null ? Number(row.debt_inflows)        : null,
        debt_payments:       row.debt_payments       !== null ? Number(row.debt_payments)       : null,
        enrichment_coverage: row.enrichment_coverage !== null ? Number(row.enrichment_coverage) : null,
        notable_expenses:    parseJsonbField(row.notable_expenses),
        structured_summary:  parseJsonbField(row.structured_summary),
      };
    });
  }

  async upsertDigest(year: number, month: number, data: DigestRow): Promise<void> {
    const tenantId = this.tenantId;
    if (!tenantId) throw new Error("upsertDigest requires tenantId");
    const flagsLiteral = data.flags?.length
      ? "{" + data.flags.map((f) => '"' + f.replace(/"/g, '\\"') + '"').join(",") + "}"
      : null;
    await this.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await tx`
        INSERT INTO ai_monthly_digest (
          tenant_id, year, month,
          cashflow_real, debt_inflows, debt_payments,
          narrative_pt, structured_summary,
          flags, notable_expenses,
          enrichment_coverage, model_version, digest_at
        ) VALUES (
          ${tenantId}::uuid, ${year}, ${month},
          ${data.cashflow_real}, ${data.debt_inflows}, ${data.debt_payments},
          ${data.narrative_pt}, ${JSON.stringify(
            typeof data.structured_summary === "string"
              ? JSON.parse(data.structured_summary)
              : data.structured_summary
          )}::jsonb,
          ${flagsLiteral}::text[], ${JSON.stringify(
            typeof data.notable_expenses === "string"
              ? JSON.parse(data.notable_expenses)
              : data.notable_expenses
          )}::jsonb,
          ${data.enrichment_coverage}, ${data.model_version}, NOW()
        )
        ON CONFLICT (tenant_id, year, month) DO UPDATE SET
          cashflow_real       = EXCLUDED.cashflow_real,
          debt_inflows        = EXCLUDED.debt_inflows,
          debt_payments       = EXCLUDED.debt_payments,
          narrative_pt        = EXCLUDED.narrative_pt,
          structured_summary  = EXCLUDED.structured_summary,
          flags               = EXCLUDED.flags,
          notable_expenses    = EXCLUDED.notable_expenses,
          enrichment_coverage = EXCLUDED.enrichment_coverage,
          model_version       = EXCLUDED.model_version,
          digest_at           = NOW()
      `;
    });
  }

  async getActiveTenantsIds(): Promise<string[]> {
    const rows = await this.sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE status = 'active'
    `;
    return rows.map((r) => r.id);
  }

  async getExportTransactions(params: {
    dateFrom: string;
    dateTo: string;
    categoryGroup?: string;
    limit: number;
  }): Promise<{ data: string; descricao: string; categoria: string | null; grupo: string | null; membro: string | null; valor: number; tipo: string }[]> {
    return this.withTenant(async (q) => {
      type Row = { data: string; descricao: string; categoria: string | null; grupo: string | null; membro: string | null; valor: string; tipo: string };
      let rows: Row[];
      if (params.categoryGroup) {
        rows = await q<Row[]>`
          SELECT
            (te.date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::DATE::TEXT AS data,
            te.description AS descricao,
            te.category_pt AS categoria,
            te.category_group_pt AS grupo,
            tm.display_name AS membro,
            (CASE te.transaction_kind
              WHEN 'EXPENSE' THEN -ABS(te.amount)
              WHEN 'INCOME'  THEN  ABS(te.amount)
              WHEN 'INVEST'  THEN -ABS(te.amount)
              ELSE te.amount
            END)::text AS valor,
            te.transaction_kind AS tipo
          FROM transactions_enriched te
          LEFT JOIN tenant_members tm ON tm.name = te.owner_normalized AND tm.tenant_id = te.tenant_id
          WHERE (te.date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::DATE
                BETWEEN ${params.dateFrom}::date AND ${params.dateTo}::date
            AND te.category_group_pt = ${params.categoryGroup}
          ORDER BY te.date DESC
          LIMIT ${params.limit}
        `;
      } else {
        rows = await q<Row[]>`
          SELECT
            (te.date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::DATE::TEXT AS data,
            te.description AS descricao,
            te.category_pt AS categoria,
            te.category_group_pt AS grupo,
            tm.display_name AS membro,
            (CASE te.transaction_kind
              WHEN 'EXPENSE' THEN -ABS(te.amount)
              WHEN 'INCOME'  THEN  ABS(te.amount)
              WHEN 'INVEST'  THEN -ABS(te.amount)
              ELSE te.amount
            END)::text AS valor,
            te.transaction_kind AS tipo
          FROM transactions_enriched te
          LEFT JOIN tenant_members tm ON tm.name = te.owner_normalized AND tm.tenant_id = te.tenant_id
          WHERE (te.date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::DATE
                BETWEEN ${params.dateFrom}::date AND ${params.dateTo}::date
          ORDER BY te.date DESC
          LIMIT ${params.limit}
        `;
      }
      return rows.map((r) => ({ ...r, valor: Number(r.valor) }));
    });
  }

  async getExportSummary(params: {
    year: number;
    month?: number;
  }): Promise<{ ano: number; mes: number; grupo: string; total_gasto: number }[]> {
    return this.withTenant(async (q) => {
      type Row = { ano: number; mes: number; grupo: string; total_gasto: string };
      let rows: Row[];
      if (params.month) {
        rows = await q<Row[]>`
          SELECT
            year AS ano,
            month AS mes,
            group_pt AS grupo,
            total_gastos AS total_gasto
          FROM cube_gastos_mensais
          WHERE year = ${params.year} AND month = ${params.month}
          ORDER BY month, group_pt
        `;
      } else {
        rows = await q<Row[]>`
          SELECT
            year AS ano,
            month AS mes,
            group_pt AS grupo,
            total_gastos AS total_gasto
          FROM cube_gastos_mensais
          WHERE year = ${params.year}
          ORDER BY month, group_pt
        `;
      }
      return rows.map((r) => ({ ...r, total_gasto: Number(r.total_gasto) }));
    });
  }

  async getParcelasAgrupadas(): Promise<CartaoResumo[]> {
    return this.withTenant(async (q) => {
      const rows = await q<{
        account_id: string;
        cartao: string;
        cc_credit_limit: string | null;
        total_comprometido: string;
        compromissos: unknown;
      }[]>`
        SELECT account_id, cartao, cc_credit_limit, total_comprometido, compromissos
        FROM cube_parcelas_cartao
        ORDER BY total_comprometido DESC
      `;
      return rows.map(r => ({
        account_id: r.account_id,
        cartao: r.cartao,
        cc_credit_limit: r.cc_credit_limit !== null ? Number(r.cc_credit_limit) : null,
        total_comprometido: Number(r.total_comprometido),
        compromissos: parseJsonbField<CompromissoItem[]>(r.compromissos) ?? [],
      }));
    });
  }

  async getParcelasTimeline(): Promise<ParcelaTimeline[]> {
    return this.withTenant(async (q) => {
      const rows = await q<{
        mes_referencia: string;
        account_id: string;
        cartao: string;
        total_parcelas_mes: string;
        breakdown: unknown;
      }[]>`
        SELECT mes_referencia, account_id, cartao, total_parcelas_mes, breakdown
        FROM cube_parcelas_por_mes
        ORDER BY mes_referencia ASC, total_parcelas_mes DESC
      `;
      return rows.map(r => ({
        mes_referencia: r.mes_referencia,
        account_id: r.account_id,
        cartao: r.cartao,
        total_parcelas_mes: Number(r.total_parcelas_mes),
        breakdown: parseJsonbField<ParcelaTimelineBreakdown[]>(r.breakdown) ?? [],
      }));
    });
  }

  async close(): Promise<void> {
    if (this.ownsSql) {
      await this.sql.close();
    }
  }
}
