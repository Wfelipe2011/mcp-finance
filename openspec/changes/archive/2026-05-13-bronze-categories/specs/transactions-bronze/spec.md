## MODIFIED Requirements

### Requirement: Tabela transactions_enriched (bronze)
A tabela `transactions_enriched` SHALL conter as seguintes colunas (e somente estas):

**Identidade:**
- `id TEXT PRIMARY KEY`
- `account_id TEXT NOT NULL REFERENCES accounts(id)`

**Valor (sempre BRL):**
- `amount NUMERIC(18,4)` — sempre em BRL (USD convertido via `amount_in_account_currency` do Pluggy)
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
- `category TEXT` — nome original do Pluggy em inglês (preservado para auditoria)
- `category_id TEXT` — código Pluggy (pode ser sobrescrito pelo override)
- `category_pt TEXT` — tradução PT-BR da categoria (derivada de `category_labels` ou override)
- `category_group TEXT` — 2 primeiros dígitos do `category_id`, identifica o grupo pai
- `category_group_pt TEXT` — nome do grupo pai em PT-BR (derivado de `category_groups`)
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

#### Scenario: Categorias PT-BR disponíveis após sync
- **WHEN** `bun run sync` conclui com sucesso
- **THEN** todas as linhas de `transactions_enriched` com `category_id NOT NULL` têm `category_pt NOT NULL` e `category_group_pt NOT NULL`

#### Scenario: Override atualiza category_pt e category_group_pt
- **WHEN** uma transação bate com uma regra em `category_overrides`
- **THEN** `category_id`, `category_pt`, `category_group`, `category_group_pt` refletem a categorização do override (não a do Pluggy)

#### Scenario: Agrupamento por categoria em PT-BR
- **WHEN** uma query agrupa por `category_group_pt`
- **THEN** todas as transações de restaurante, delivery e supermercado aparecem sob o grupo `'Alimentação'`
