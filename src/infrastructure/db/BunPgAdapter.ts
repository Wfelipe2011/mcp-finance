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
  status: string;
  error_count: number;
  last_error: string | null;
  jobs_done: number;
  last_seen_at: string | null;
  created_at: string;
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

export class BunPgAdapter {
  private readonly sql: SQL;

  readonly items: ItemRepository;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly investments: InvestmentRepository;
  readonly investmentTransactions: InvestmentTransactionRepository;
  readonly enrichTransactions: EnrichTransactionsRepository;
  readonly aiInsights: AiInsightsRepository;
  readonly aiDigests: AiDigestsRepository;
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
  };

  constructor(private readonly tenantId?: string) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL is not set");
    this.sql = new SQL(url);

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
                id, connector, status, execution_status, products,
                last_updated_at, created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.connector}, ${r.status}, ${r.executionStatus}, ${r.products},
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
                id, item_id, type, subtype, name, balance, currency_code, number,
                owner, tax_number, marketing_name,
                transfer_number, closing_balance, automatically_invested_balance,
                overdraft_contracted_limit, overdraft_used_limit, unarranged_overdraft_amount,
                cc_level, cc_brand, cc_balance_due_date, cc_credit_limit,
                cc_available_credit_limit, cc_minimum_payment, cc_balance_foreign_currency,
                created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.itemId}, ${r.type}, ${r.subtype}, ${r.name}, ${r.balance},
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
                id, account_id, description, description_raw, currency_code,
                amount, amount_in_account_currency, date, category, category_id,
                balance, provider_code, status, type, operation_type, provider_id, "order",
                payment_data, cc_card_number, cc_bill_id, cc_purchase_date,
                cc_total_installments, cc_installment_number, cc_payee_mcc,
                merchant, acquirer_data, created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.accountId}, ${r.description}, ${r.descriptionRaw}, ${r.currencyCode},
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
                id, item_id, name, type, subtype, balance, currency_code,
                value, quantity, amount, taxes, taxes2,
                amount_profit, amount_withdrawal, amount_original,
                last_month_rate, last_twelve_months_rate, annual_rate, fixed_annual_rate, rate, rate_type,
                code, isin, number, metadata,
                issuer, issuer_cnpj, issue_date, purchase_date, due_date, date,
                owner, institution, status, created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.itemId}, ${r.name}, ${r.type}, ${r.subtype}, ${r.balance}, ${r.currencyCode},
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
                id, investment_id, description, amount, value, quantity,
                trade_date, date, type, net_amount, movement_type, brokerage_number, agreed_rate,
                exp_income_tax, exp_brokerage_fee, exp_service_tax, exp_settlement_fee,
                exp_clearing_fee, exp_stock_exchange_fee, exp_custody_fee, exp_operating_fee,
                exp_trading_assets_notice_fee, exp_maintenance_fee, exp_other,
                created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.investmentId}, ${r.description}, ${r.amount}, ${r.value}, ${r.quantity},
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
              JOIN category_overrides co ON tx.description ILIKE co.pattern
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
              JOIN category_overrides co2 ON te.description ILIKE co2.pattern
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
        await sql`
          INSERT INTO ai_transaction_insights (
            tenant_id, transaction_id, merchant_name, merchant_country,
            is_recurring, recurrence_period, expense_context,
            is_debt_related, anomaly_score, tags, category_hint,
            model_version, analyzed_at
          ) VALUES (
            current_setting('app.tenant_id')::UUID,
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
          SELECT id, name, ai_base_url, ai_api_key, ai_model, status, error_count,
                 last_error, jobs_done, last_seen_at, created_at
          FROM workers
          ORDER BY created_at ASC
        `;
      },
      async findActive() {
        return sql<WorkerRow[]>`
          SELECT id, name, ai_base_url, ai_api_key, ai_model, status, error_count,
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
      const rows = await q<{ saldo_liquido: string; media_saidas_90d: string | null; runway_meses: string | null }[]>`
        SELECT saldo_liquido, media_saidas_90d, runway_meses FROM kpi_cash_runway LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        saldo_liquido:    Number(row.saldo_liquido),
        media_saidas_90d: row.media_saidas_90d !== null ? Number(row.media_saidas_90d) : null,
        runway_meses:     row.runway_meses     !== null ? Number(row.runway_meses)     : null,
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
      };
    });
  }

  async getTransacoesMensais(year: number, month: number, limit: number, offset: number) {
    return this.withTenant(async (q) => {
      const items = await q<
        {
          transaction_id: string; date_day: string; description: string;
          category_pt: string | null; category_group_pt: string | null;
          amount_signed: string; transaction_kind: string; owner_normalized: string;
          merchant_name: string | null; is_recurring: boolean | null;
          anomaly_score: string | null; tags: string[] | null;
        }[]
      >`
        SELECT t.transaction_id, t.date_day, t.description,
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
          ${data.narrative_pt}, ${JSON.stringify(data.structured_summary)}::jsonb,
          ${flagsLiteral}::text[], ${JSON.stringify(data.notable_expenses)}::jsonb,
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

  async close(): Promise<void> {
    await this.sql.close();
  }
}
