## MODIFIED Requirements

### Requirement: Tabela items
O sistema SHALL ter tabela `items` com campos: `id` (TEXT PK), `tenant_id` (UUID NOT NULL REFERENCES tenants(id)), `connector` (JSONB), `status` (TEXT), `execution_status` (TEXT), `products` (TEXT[] — array PostgreSQL), `last_updated_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ), `synced_at` (TIMESTAMPTZ). A coluna `tenant_id` é obrigatória. RLS `tenant_isolation` está ativo com `USING (tenant_id = current_setting('app.tenant_id', true)::UUID)`.

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

## REMOVED Requirements

### Requirement: Timestamps armazenados como TEXT ISO 8601
**Reason**: Migração para PostgreSQL nativo — timestamps são agora `TIMESTAMPTZ`, não TEXT. O driver Bun/postgres retorna objetos Date nativos.
**Migration**: Queries que comparavam timestamps como strings devem usar operadores de data do PostgreSQL (`>`, `<`, `BETWEEN`).

### Requirement: Tabela identities
**Reason**: A tabela `identities` não foi implementada no PostgreSQL — não existe no schema atual (`schema.sql`). O requisito era parte do spec SQLite legado.
**Migration**: N/A — funcionalidade nunca chegou ao ar.

### Requirement: Criar schema no primeiro uso (finance.db)
**Reason**: O sistema usa PostgreSQL 16, não SQLite. O arquivo `finance.db` não existe. Schema é aplicado via `schema.sql` e scripts de migração.
**Migration**: Scripts de migração SQL executados manualmente ou via docker-compose init.
