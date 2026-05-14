import { SQL } from "bun";
import type { ItemRepository } from "../../domain/ports/repositories/ItemRepository.ts";
import type { AccountRepository } from "../../domain/ports/repositories/AccountRepository.ts";
import type { TransactionRepository } from "../../domain/ports/repositories/TransactionRepository.ts";
import type { InvestmentRepository } from "../../domain/ports/repositories/InvestmentRepository.ts";
import type { InvestmentTransactionRepository } from "../../domain/ports/repositories/InvestmentTransactionRepository.ts";
import type { IdentityRepository } from "../../domain/ports/repositories/IdentityRepository.ts";
import type { EnrichTransactionsRepository } from "../../domain/ports/repositories/EnrichTransactionsRepository.ts";
import type { Item } from "../../domain/entities/Item.ts";
import type { Account } from "../../domain/entities/Account.ts";
import type { Transaction } from "../../domain/entities/Transaction.ts";
import type { Investment } from "../../domain/entities/Investment.ts";
import type { InvestmentTransaction } from "../../domain/entities/InvestmentTransaction.ts";
import type { Identity } from "../../domain/entities/Identity.ts";
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

export interface AiInsightsRepository {
  getUnenriched(limit: number): Promise<UnenrichedTransaction[]>;
  upsertOne(row: InsightRow): Promise<void>;
}

export interface AiDigestsRepository {
  getMonthInsights(year: number, month: number): Promise<MonthInsightRow[]>;
  getTotalTransactionCount(year: number, month: number): Promise<number>;
  upsert(row: DigestRow): Promise<void>;
}

export class BunPgAdapter {
  private readonly sql: SQL;

  readonly items: ItemRepository;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly investments: InvestmentRepository;
  readonly investmentTransactions: InvestmentTransactionRepository;
  readonly identities: IdentityRepository;
  readonly enrichTransactions: EnrichTransactionsRepository;
  readonly aiInsights: AiInsightsRepository;
  readonly aiDigests: AiDigestsRepository;

  constructor() {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL is not set");
    this.sql = new SQL(url);

    const sql = this.sql;

    // ── items ────────────────────────────────────────────────────────────────
    this.items = {
      async upsertMany(rows: Item[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
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

    // ── identities ────────────────────────────────────────────────────────────
    this.identities = {
      async upsertMany(rows: Identity[]): Promise<void> {
        if (rows.length === 0) return;
        await sql.begin(async (tx) => {
          for (const r of rows) {
            await tx`
              INSERT INTO identities (
                id, item_id, full_name, birth_date, tax_number, document, document_type,
                job_title, company_name, phone_numbers, emails, addresses, relations, investor_profile,
                establishment_code, establishment_name,
                fr_start_date, fr_products_services_type, fr_procurators, fr_accounts,
                qual_company_cnpj, qual_informed_income_amount, qual_informed_income_frequency,
                qual_informed_income_date, created_at, updated_at, synced_at
              ) VALUES (
                ${r.id}, ${r.itemId}, ${r.fullName}, ${r.birthDate}, ${r.taxNumber},
                ${r.document}, ${r.documentType}, ${r.jobTitle}, ${r.companyName},
                ${r.phoneNumbers}, ${r.emails}, ${r.addresses}, ${r.relations}, ${r.investorProfile},
                ${r.establishmentCode}, ${r.establishmentName},
                ${r.frStartDate}, ${r.frProductsServicesType}, ${r.frProcurators}, ${r.frAccounts},
                ${r.qualCompanyCnpj}, ${r.qualInformedIncomeAmount}, ${r.qualInformedIncomeFrequency},
                ${r.qualInformedIncomeDate}, ${r.createdAt}, ${r.updatedAt}, ${r.syncedAt}
              )
              ON CONFLICT (id) DO UPDATE SET
                full_name                      = EXCLUDED.full_name,
                birth_date                     = EXCLUDED.birth_date,
                tax_number                     = EXCLUDED.tax_number,
                phone_numbers                  = EXCLUDED.phone_numbers,
                emails                         = EXCLUDED.emails,
                addresses                      = EXCLUDED.addresses,
                fr_start_date                  = EXCLUDED.fr_start_date,
                fr_products_services_type      = EXCLUDED.fr_products_services_type,
                fr_procurators                 = EXCLUDED.fr_procurators,
                fr_accounts                    = EXCLUDED.fr_accounts,
                qual_informed_income_amount    = EXCLUDED.qual_informed_income_amount,
                qual_informed_income_frequency = EXCLUDED.qual_informed_income_frequency,
                qual_informed_income_date      = EXCLUDED.qual_informed_income_date,
                updated_at                     = EXCLUDED.updated_at,
                synced_at                      = EXCLUDED.synced_at
            `;
          }
        });
      },
    };

    // ── enrichTransactions ────────────────────────────────────────────────────
    this.enrichTransactions = {
      async enrich(): Promise<void> {
        await sql.begin(async (tx) => {
          await tx`TRUNCATE transactions_enriched`;
          await tx`
            INSERT INTO transactions_enriched
            WITH kind AS (
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
                  WHEN t.type = 'DEBIT' THEN 'EXPENSE'
                  ELSE 'INCOME'
                END AS transaction_kind
              FROM transactions t
            )
            SELECT
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
            FROM transactions t
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

      async upsertOne(row: InsightRow): Promise<void> {
        // Bun SQL doesn't auto-serialize JS arrays to Postgres text[] literals
        const tagsLiteral = row.tags?.length
          ? "{" + row.tags.map((t) => '"' + t.replace(/"/g, '\\"') + '"').join(",") + "}"
          : null;
        await sql`
          INSERT INTO ai_transaction_insights (
            transaction_id, merchant_name, merchant_country,
            is_recurring, recurrence_period, expense_context,
            is_debt_related, anomaly_score, tags, category_hint,
            model_version, analyzed_at
          ) VALUES (
            ${row.transaction_id}, ${row.merchant_name ?? null}, ${row.merchant_country ?? null},
            ${row.is_recurring ?? null}, ${row.recurrence_period ?? null}, ${row.expense_context ?? null},
            ${row.is_debt_related}, ${row.anomaly_score ?? null}, ${tagsLiteral}::text[], ${row.category_hint ?? null},
            ${row.model_version}, NOW()
          )
          ON CONFLICT (transaction_id) DO UPDATE SET
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
        const rows = await sql<MonthInsightRow[]>`
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
        return rows;
      },

      async getTotalTransactionCount(year: number, month: number): Promise<number> {
        const rows = await sql<[{ count: string }]>`
          SELECT COUNT(*) AS count
          FROM f_transacoes
          WHERE EXTRACT(YEAR  FROM date_day) = ${year}
            AND EXTRACT(MONTH FROM date_day) = ${month}
        `;
        return parseInt(rows[0]?.count ?? "0", 10);
      },

      async upsert(row: DigestRow): Promise<void> {
        // Bun SQL doesn't auto-serialize JS arrays to Postgres text[] literals
        const flagsLiteral = row.flags?.length
          ? "{" + row.flags.map((f) => '"' + f.replace(/"/g, '\\"') + '"').join(",") + "}"
          : null;
        await sql`
          INSERT INTO ai_monthly_digest (
            year, month,
            cashflow_real, debt_inflows, debt_payments,
            narrative_pt, structured_summary,
            flags, notable_expenses,
            enrichment_coverage, model_version, digest_at
          ) VALUES (
            ${row.year}, ${row.month},
            ${row.cashflow_real}, ${row.debt_inflows}, ${row.debt_payments},
            ${row.narrative_pt}, ${JSON.stringify(row.structured_summary)}::jsonb,
            ${flagsLiteral}::text[], ${JSON.stringify(row.notable_expenses)}::jsonb,
            ${row.enrichment_coverage}, ${row.model_version}, NOW()
          )
          ON CONFLICT (year, month) DO UPDATE SET
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
  }

  async close(): Promise<void> {
    await this.sql.close();
  }
}
