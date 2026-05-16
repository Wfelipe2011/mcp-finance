## 1. Infraestrutura Docker

- [x] 1.1 Criar `docker-compose.yml` na raiz com serviço `postgres:16`, volume persistente e healthcheck (`pg_isready`)
- [x] 1.2 Criar `.env.example` com as variáveis: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
- [x] 1.3 Adicionar `finance.db`, `finance.db-shm`, `finance.db-wal` e `.env` ao `.gitignore`

## 2. Schema PostgreSQL

- [x] 2.1 Reescrever `src/infrastructure/db/schema.sql` para PostgreSQL: renomear todos os identificadores para `snake_case`, ajustar tipos (`NUMERIC(18,4)` para valores monetários, `TEXT` para datas e JSON), manter `CREATE TABLE IF NOT EXISTS` e índices
- [x] 2.2 Verificar que o schema executa sem erros via `psql` ou `docker exec postgres psql -U finance -f /docker-entrypoint-initdb.d/01-schema.sql` em banco vazio
- [x] 2.3 Atualizar `docker-compose.yml` para montar `src/infrastructure/db/schema.sql` em `/docker-entrypoint-initdb.d/01-schema.sql`

## 3. BunPgAdapter

- [x] 3.1 Criar `src/infrastructure/db/BunPgAdapter.ts` com classe `BunPgAdapter` que instancia `new SQL(process.env.DATABASE_URL)` e expõe os 6 repositórios
- [x] 3.2 Implementar `items.upsertMany` com INSERT ... ON CONFLICT (id) DO UPDATE, mapeando camelCase→snake_case (`lastUpdatedAt`→`last_updated_at`, `executionStatus`→`execution_status`, `syncedAt`→`synced_at`)
- [x] 3.3 Implementar `accounts.upsertMany` com todos os campos mapeados para snake_case (`itemId`→`item_id`, `currencyCode`→`currency_code`, `ccBalanceDueDate`→`cc_balance_due_date`, etc.)
- [x] 3.4 Implementar `transactions.upsertMany` com todos os campos mapeados (`accountId`→`account_id`, `descriptionRaw`→`description_raw`, `amountInAccountCurrency`→`amount_in_account_currency`, `categoryId`→`category_id`, `providerCode`→`provider_code`, `operationType`→`operation_type`, `providerId`→`provider_id`, `paymentData`→`payment_data`, `ccCardNumber`→`cc_card_number`, `ccBillId`→`cc_bill_id`, `ccPurchaseDate`→`cc_purchase_date`, `ccTotalInstallments`→`cc_total_installments`, `ccInstallmentNumber`→`cc_installment_number`, `ccPayeeMCC`→`cc_payee_mcc`, `acquirerData`→`acquirer_data`)
- [x] 3.5 Implementar `investments.upsertMany` com todos os campos mapeados (`itemId`→`item_id`, `currencyCode`→`currency_code`, `amountProfit`→`amount_profit`, `amountWithdrawal`→`amount_withdrawal`, `amountOriginal`→`amount_original`, `lastMonthRate`→`last_month_rate`, `lastTwelveMonthsRate`→`last_twelve_months_rate`, `annualRate`→`annual_rate`, `fixedAnnualRate`→`fixed_annual_rate`, `rateType`→`rate_type`, `issuerCNPJ`→`issuer_cnpj`, `issueDate`→`issue_date`, `purchaseDate`→`purchase_date`, `dueDate`→`due_date`)
- [x] 3.6 Implementar `investmentTransactions.insertMany` com INSERT ... ON CONFLICT (id) DO NOTHING e todos os campos mapeados (`investmentId`→`investment_id`, `tradeDate`→`trade_date`, `netAmount`→`net_amount`, `movementType`→`movement_type`, `brokerageNumber`→`brokerage_number`, `agreedRate`→`agreed_rate`, `expIncomeTax`→`exp_income_tax`, `expBrokerageFee`→`exp_brokerage_fee`, `expServiceTax`→`exp_service_tax`, `expSettlementFee`→`exp_settlement_fee`, `expClearingFee`→`exp_clearing_fee`, `expStockExchangeFee`→`exp_stock_exchange_fee`, `expCustodyFee`→`exp_custody_fee`, `expOperatingFee`→`exp_operating_fee`, `expTradingAssetsNoticeFee`→`exp_trading_assets_notice_fee`, `expMaintenanceFee`→`exp_maintenance_fee`, `expOther`→`exp_other`)
- [x] 3.7 Implementar `identities.upsertMany` com todos os campos mapeados (`itemId`→`item_id`, `fullName`→`full_name`, `birthDate`→`birth_date`, `taxNumber`→`tax_number`, `documentType`→`document_type`, `jobTitle`→`job_title`, `companyName`→`company_name`, `phoneNumbers`→`phone_numbers`, `investorProfile`→`investor_profile`, `establishmentCode`→`establishment_code`, `establishmentName`→`establishment_name`, `frStartDate`→`fr_start_date`, `frProductsServicesType`→`fr_products_services_type`, `frProcurators`→`fr_procurators`, `frAccounts`→`fr_accounts`, `qualCompanyCnpj`→`qual_company_cnpj`, `qualInformedIncomeAmount`→`qual_informed_income_amount`, `qualInformedIncomeFrequency`→`qual_informed_income_frequency`, `qualInformedIncomeDate`→`qual_informed_income_date`)
- [x] 3.8 Adicionar método `async close(): Promise<void>` que chama `await sql.close()`
- [x] 3.9 Envolver cada `upsertMany`/`insertMany` em `sql.begin(async tx => { ... })` para transação atômica por lote

## 4. Atualizar script de sync

- [x] 4.1 Atualizar `src/scripts/sync.ts`: substituir `BunSQLiteAdapter` por `BunPgAdapter`, adicionar `await db.close()` após `useCase.run()`

## 5. Remover artefatos SQLite e MCP

- [x] 5.1 Remover `src/infrastructure/db/BunSQLiteAdapter.ts`
- [x] 5.2 Remover `src/infrastructure/db/FinanceQueryDb.ts`
- [x] 5.3 Remover `src/infrastructure/db/views/` (diretório inteiro com 11 arquivos `.sql`)
- [x] 5.4 Remover `src/infrastructure/db/views.test.ts`
- [x] 5.5 Remover `src/application/mcp/FinanceMcpServer.ts`
- [x] 5.6 Remover `src/scripts/mcp.ts`
- [x] 5.7 Remover script `"mcp"` de `package.json`
- [x] 5.8 Remover dependências `@modelcontextprotocol/sdk` e `zod` de `package.json` e `bun.lock`

## 6. Validação

- [x] 6.1 Subir Postgres: `docker compose up -d` — confirmar healthcheck verde e tabelas criadas
- [x] 6.2 Confirmar que `DATABASE_URL` está configurada no `.env` local
- [x] 6.3 Executar `bun run sync` — confirmar que completa sem erros e logar contagens
- [x] 6.4 Verificar dados no Postgres: `SELECT COUNT(*) FROM transactions` deve retornar > 0
- [x] 6.5 Executar `bun run sync` uma segunda vez — confirmar que upsert funciona (sem duplicatas, sem erros de constraint)
