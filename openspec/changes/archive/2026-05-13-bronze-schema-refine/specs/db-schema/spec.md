## MODIFIED Requirements

### Requirement: Tabela transactions_enriched (bronze)
A tabela `transactions_enriched` SHALL conter as seguintes colunas (e somente estas):

**Identidade:**
- `id TEXT PRIMARY KEY`
- `account_id TEXT NOT NULL REFERENCES accounts(id)`

**Valor:**
- `amount NUMERIC(18,4)`
- `currency_code TEXT`
- `amount_in_account_currency NUMERIC(18,4)`

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

A tabela SHALL NOT incluir: `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `created_at`, `updated_at`, `synced_at`, `payment_data`.

#### Scenario: Schema atualizado aplicado idempotentemente
- **WHEN** o DDL atualizado é aplicado em um banco que já tem `transactions_enriched`
- **THEN** a tabela antiga é removida e a nova é criada com o schema correto

#### Scenario: Repopulação após schema update
- **WHEN** `bun run sync` é executado após o DROP + CREATE
- **THEN** `transactions_enriched` tem exatamente `COUNT(*) FROM transactions` linhas com todas as colunas novas preenchidas
