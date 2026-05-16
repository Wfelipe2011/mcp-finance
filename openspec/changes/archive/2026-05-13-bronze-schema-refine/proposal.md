## Why

A tabela `transactions_enriched` foi criada com todas as colunas de `transactions` para simplicidade inicial, mas análise dos dados reais revelou que 9 colunas têm 0% de preenchimento, 2 são metadados puramente de integração sem valor analítico, e a fragmentação do campo `owner` nos `accounts` impede agrupamentos por membro da família sem pré-processamento. A camada bronze precisa ser enxuta, analítica e confiável — não um espelho ruidoso da raw.

## What Changes

- Remover 11 colunas sem valor analítico de `transactions_enriched`: `balance` (0%), `provider_code` (0%), `merchant` (0%), `acquirer_data` (0%), `cc_card_number` (47% mascarado, baixo valor), `provider_id` (ID interno Pluggy), `order` (técnico, intra-dia), `created_at`, `updated_at`, `synced_at`, `payment_data` (JSON bruto já processado em `peer_account_id`)
- Adicionar coluna `owner_normalized TEXT` em `transactions_enriched`: `LOWER(TRIM(accounts.owner))`, resolvendo a fragmentação de 3 grafias de "Wilson" em uma única chave de agrupamento
- Atualizar o SQL de enriquecimento em `BunPgAdapter.ts` para refletir o novo schema (remover projeções das colunas eliminadas, adicionar `owner_normalized` via JOIN com `accounts`)
- Atualizar o DDL em `schema.sql`

## Capabilities

### New Capabilities

- `transactions-bronze`: Refinamento da camada bronze — schema enxuto com `owner_normalized` e sem colunas de ruído de integração

### Modified Capabilities

- `db-schema`: DDL de `transactions_enriched` muda (remoção de colunas + nova coluna)

## Impact

- **`src/infrastructure/db/schema.sql`**: DROP e recriação do DDL de `transactions_enriched`
- **`src/infrastructure/db/BunPgAdapter.ts`**: SQL do método `enrichTransactions.enrich()` — remover projeções eliminadas, adicionar `owner_normalized`
- **Banco em execução**: `transactions_enriched` será recriada (DROP + CREATE + repopulada no próximo sync)
- **Sem breaking changes em `transactions`**: tabela raw permanece intacta
- **`docs/finance-context.md`**: atualizar referência às colunas da camada bronze
