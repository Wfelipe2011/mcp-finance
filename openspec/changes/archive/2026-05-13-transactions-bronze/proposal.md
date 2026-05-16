## Why

Os dados brutos do Pluggy (camada raw) contêm transferências entre contas da família, pagamentos de faturas de cartão e aportes/resgates de investimento misturados com receitas e despesas reais — inflando entradas e saídas e tornando qualquer análise de fluxo de caixa imprecisa. Precisamos de uma camada bronze onde cada transação seja classificada quanto à sua natureza antes de qualquer análise.

## What Changes

- Nova tabela `transactions_enriched` no PostgreSQL, populada após cada sync
- Contém todas as colunas de `transactions` + 3 colunas de enriquecimento:
  - `transaction_kind`: classificação da transação (`EXPENSE`, `INCOME`, `TRANSFER`, `INVEST`)
  - `peer_account_id`: para TRANSFER, o `accounts.id` da conta de destino/origem
  - `is_real_cashflow`: atalho booleano (`TRUE` = EXPENSE ou INCOME; `FALSE` = TRANSFER ou INVEST)
- `SyncUseCase.run()` ganha um step final que popula/recria `transactions_enriched`
- Lógica de detecção usa `payment_data::jsonb` cruzado com `accounts.number`

## Capabilities

### New Capabilities

- `transactions-bronze`: Tabela enriquecida com classificação de natureza de transação (EXPENSE, INCOME, TRANSFER, INVEST) e linkagem entre contas para transferências internas familiares.

### Modified Capabilities

<!-- Nenhuma spec existente é alterada -->

## Impact

- **PostgreSQL**: nova tabela `transactions_enriched` (DDL no schema ou migration)
- **`src/infrastructure/db/BunPgAdapter.ts`**: método para popular a tabela enriquecida
- **`src/application/sync/SyncUseCase.ts`**: step 6 — chamada ao enriquecimento após sync completo
- **`src/infrastructure/db/schema.sql`**: DDL da nova tabela
- **Sem breaking changes**: `transactions` original permanece intacta
