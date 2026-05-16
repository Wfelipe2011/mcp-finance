## MODIFIED Requirements

### Requirement: Tabela transactions_enriched (bronze)
A tabela `transactions_enriched` SHALL conter as seguintes colunas (e somente estas):

**Identidade:**
- `id TEXT PRIMARY KEY`
- `account_id TEXT NOT NULL REFERENCES accounts(id)`

**Valor (sempre BRL):**
- `amount NUMERIC(18,4)` — sempre em BRL
- `currency_code TEXT` — sempre `'BRL'`

**Tempo:**
- `date TEXT`

**Descrição:**
- `description TEXT`
- `description_raw TEXT`

**Classificação Pluggy:**
- `type TEXT`
- `operation_type TEXT`
- `status TEXT`
- `category TEXT`
- `category_id TEXT`
- `category_pt TEXT`
- `category_group TEXT`
- `category_group_pt TEXT`
- `cc_bill_id TEXT`
- `cc_total_installments INTEGER`
- `cc_installment_number INTEGER`
- `cc_purchase_date TEXT`
- `cc_payee_mcc INTEGER`

**Enriquecimento (bronze):**
- `transaction_kind TEXT NOT NULL`
- `peer_account_id TEXT REFERENCES accounts(id)`
- `is_real_cashflow BOOLEAN NOT NULL`
- `owner_normalized TEXT NOT NULL`

A tabela SHALL NOT incluir: `amount_in_account_currency`, `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `created_at`, `updated_at`, `synced_at`, `payment_data`.

#### Scenario: Schema atualizado aplicado idempotentemente
- **WHEN** o DDL atualizado é aplicado em um banco que já tem `transactions_enriched`
- **THEN** a tabela antiga é removida e a nova é criada com o schema correto incluindo as colunas de categoria PT-BR

#### Scenario: Repopulação após schema update
- **WHEN** `bun run sync` é executado após o DROP + CREATE
- **THEN** `transactions_enriched` tem exatamente `COUNT(*) FROM transactions` linhas com `category_pt` e `category_group_pt` preenchidos

## ADDED Requirements

### Requirement: Tabelas category_groups e category_labels no schema
O `schema.sql` SHALL incluir as definições DDL de `category_groups` e `category_labels` com suas respectivas constraints e FK, seguidas do seed com todas as categorias Pluggy via `INSERT ... ON CONFLICT DO NOTHING`. Essas tabelas SHALL ser criadas antes de `transactions_enriched` (que referencia `category_labels` indiretamente).

#### Scenario: Tabelas existem após inicialização
- **WHEN** o banco é inicializado via `schema.sql`
- **THEN** `category_groups` e `category_labels` existem e contêm os dados seed

### Requirement: Tabela category_overrides no schema
O `schema.sql` SHALL incluir a definição DDL de `category_overrides` com FK para `category_labels(category_id)`, seguida do seed com as regras iniciais conhecidas via `INSERT ... ON CONFLICT DO NOTHING`.

#### Scenario: Tabela existe após inicialização com regras iniciais
- **WHEN** o banco é inicializado via `schema.sql`
- **THEN** `category_overrides` existe com ao menos 3 regras pré-carregadas (Amazon AWS, OpenRouter, Neon.tech)
