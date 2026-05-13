import { SQL } from "bun";
import type { ItemRepository } from "../../domain/ports/repositories/ItemRepository.ts";
import type { AccountRepository } from "../../domain/ports/repositories/AccountRepository.ts";
import type { TransactionRepository } from "../../domain/ports/repositories/TransactionRepository.ts";
import type { InvestmentRepository } from "../../domain/ports/repositories/InvestmentRepository.ts";
import type { InvestmentTransactionRepository } from "../../domain/ports/repositories/InvestmentTransactionRepository.ts";
import type { IdentityRepository } from "../../domain/ports/repositories/IdentityRepository.ts";
import type { Item } from "../../domain/entities/Item.ts";
import type { Account } from "../../domain/entities/Account.ts";
import type { Transaction } from "../../domain/entities/Transaction.ts";
import type { Investment } from "../../domain/entities/Investment.ts";
import type { InvestmentTransaction } from "../../domain/entities/InvestmentTransaction.ts";
import type { Identity } from "../../domain/entities/Identity.ts";

export class BunPgAdapter {
  private readonly sql: SQL;

  readonly items: ItemRepository;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly investments: InvestmentRepository;
  readonly investmentTransactions: InvestmentTransactionRepository;
  readonly identities: IdentityRepository;

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
  }

  async close(): Promise<void> {
    await this.sql.close();
  }
}
