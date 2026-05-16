## Requirements

### Requirement: Criar schema na inicialização
O sistema SHALL criar todas as tabelas via `CREATE TABLE IF NOT EXISTS` na inicialização do banco PostgreSQL, garantindo idempotência — rodar múltiplas vezes não deve causar erros.

#### Scenario: Primeira inicialização do banco
- **WHEN** o container postgres sobe com volume vazio
- **THEN** todas as tabelas são criadas sem erro e o banco fica pronto para uso

#### Scenario: Banco já inicializado
- **WHEN** o container postgres já tem as tabelas criadas
- **THEN** a inicialização completa sem erro e sem alterar dados existentes

### Requirement: Tabela items
O sistema SHALL ter tabela `items` com campos: `id` (TEXT PK), `tenant_id` (UUID NOT NULL REFERENCES tenants(id)), `connector` (TEXT), `status` (TEXT), `execution_status` (TEXT), `products` (TEXT), `last_updated_at` (TEXT), `created_at` (TEXT), `updated_at` (TEXT), `synced_at` (TEXT NOT NULL). A coluna `tenant_id` é obrigatória. RLS `tenant_isolation` está ativo com `USING (tenant_id = current_setting('app.tenant_id', true)::UUID)`.

#### Scenario: Upsert de item existente
- **WHEN** um item com mesmo `id` é inserido novamente dentro de uma transação com `SET LOCAL app.tenant_id`
- **THEN** todos os campos são atualizados incluindo `synced_at`, sem duplicar a linha

#### Scenario: Upsert de item de outro tenant é bloqueado
- **WHEN** tenta-se inserir item com `tenant_id` diferente do `current_setting('app.tenant_id')`
- **THEN** a política RLS bloqueia a operação

### Requirement: Tabela accounts
O sistema SHALL ter tabela `accounts` com campo `tenant_id` (UUID NOT NULL REFERENCES tenants(id)) adicionado. RLS `tenant_isolation` ativo.

#### Scenario: Upsert de account com saldo atualizado
- **WHEN** uma account já existe no mesmo tenant e o saldo mudou
- **THEN** o novo saldo é persistido e `synced_at` é atualizado

### Requirement: Tabela transactions com preservação de created_at
O sistema SHALL ter tabela `transactions` com campo `tenant_id` (UUID NOT NULL REFERENCES tenants(id)) adicionado. RLS `tenant_isolation` ativo. `DELETE FROM transactions_enriched` SHALL ser usado no lugar de `TRUNCATE transactions_enriched`.

#### Scenario: Upsert de transaction PENDING que virou POSTED
- **WHEN** a mesma transaction é re-inserida com status diferente
- **THEN** o `status` é atualizado, `synced_at` é atualizado e `created_at` permanece o valor original

#### Scenario: Re-inserção de transaction já existente com mesmo status
- **WHEN** a mesma transaction é inserida novamente sem mudanças
- **THEN** apenas `synced_at` é atualizado, demais campos mantêm valor

#### Scenario: DELETE escoped por tenant
- **WHEN** o sync executa `DELETE FROM transactions_enriched` com `SET LOCAL app.tenant_id` ativo
- **THEN** apenas linhas do tenant corrente são removidas; dados de outros tenants permanecem intactos

### Requirement: Tabela investments
O sistema SHALL ter tabela `investments` com campo `tenant_id` (UUID NOT NULL REFERENCES tenants(id)) adicionado. RLS `tenant_isolation` ativo.

#### Scenario: Upsert de investment com balance atualizado
- **WHEN** um investment do tenant corrente é atualizado
- **THEN** apenas o investment desse tenant é afetado

### Requirement: Tabela investment_transactions com INSERT IGNORE
O sistema SHALL ter tabela `investment_transactions` com campo `tenant_id` (UUID NOT NULL REFERENCES tenants(id)) adicionado. RLS `tenant_isolation` ativo. Inserção usa `INSERT ... ON CONFLICT DO NOTHING`.

#### Scenario: Re-inserção de investment transaction existente
- **WHEN** uma investment transaction existente é inserida novamente
- **THEN** a linha existente não é modificada

### Requirement: Tabela category_overrides por tenant
O sistema SHALL ter tabela `category_overrides` com campo `tenant_id` (UUID NOT NULL REFERENCES tenants(id)) adicionado. As 3 linhas seed globais (AWS/OpenRouter/Neon) SHALL ser removidas. Overrides passam a ser exclusivamente por tenant. RLS `tenant_isolation` ativo.

#### Scenario: Override de categoria de um tenant não vaza para outro
- **WHEN** tenant A tem um override para categoria X
- **THEN** tenant B não vê esse override mesmo consultando a mesma tabela

### Requirement: Índices para consultas comuns
O sistema SHALL criar índices: `(account_id, date DESC)` em `transactions`, `(investment_id, date DESC)` em `investment_transactions`, `(item_id)` em `accounts` e `investments`, `(status, tenant_id, date DESC)` em `enrich_jobs`.

#### Scenario: Criação de índices na inicialização
- **WHEN** o banco é inicializado
- **THEN** todos os índices são criados via `CREATE INDEX IF NOT EXISTS`

### Requirement: Database schema is initialized on startup
O schema SHALL ser aplicado via scripts SQL montados em `/docker-entrypoint-initdb.d/` na inicialização do container PostgreSQL 16. Todos os `CREATE TABLE IF NOT EXISTS` garantem idempotência.

#### Scenario: Inicialização do container
- **WHEN** o container postgres sobe com volume vazio
- **THEN** todos os scripts SQL são executados em ordem (01-schema, 02-silver-dimensions, 03-gold-ai, 04-silver-facts, 05-gold-cubes, 06-grants) e o banco fica pronto para uso

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

A tabela SHALL NOT incluir: `amount_in_account_currency`, `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `created_at`, `updated_at`, `synced_at`, `payment_data`.

#### Scenario: Schema atualizado aplicado idempotentemente
- **WHEN** o DDL atualizado é aplicado em um banco com `transactions_enriched` existente
- **THEN** `CREATE TABLE IF NOT EXISTS` não causa erro e os dados existentes são preservados

#### Scenario: Repopulação após sync
- **WHEN** `bun run sync` é executado
- **THEN** `transactions_enriched` tem exatamente as linhas do tenant corrente com todas as colunas preenchidas
