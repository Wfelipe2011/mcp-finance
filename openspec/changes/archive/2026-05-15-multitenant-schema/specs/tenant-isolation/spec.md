## ADDED Requirements

### Requirement: Tabela tenants
O sistema SHALL ter tabela `tenants` com campos: `id` (UUID PK, default `gen_random_uuid()`), `name` (TEXT NOT NULL — ex: "Família Silva"), `email` (TEXT NOT NULL UNIQUE — login no app), `password_hash` (TEXT NOT NULL — bcrypt), `pluggy_email` (TEXT NOT NULL — conta Pluggy da família), `pluggy_password` (TEXT NOT NULL — senha Pluggy em plaintext no MVP), `status` (TEXT NOT NULL DEFAULT 'active', CHECK em `active`/`inactive`), `created_at` (TIMESTAMPTZ DEFAULT now()), `last_login_at` (TIMESTAMPTZ NULL).

#### Scenario: Criação de tenant
- **WHEN** um novo tenant é inserido com email único
- **THEN** o registro é criado com `status='active'`, `created_at=now()` e `last_login_at=NULL`

#### Scenario: Email duplicado
- **WHEN** tenta-se inserir um tenant com email já existente
- **THEN** o banco retorna erro de violação de UNIQUE constraint

#### Scenario: Status inválido
- **WHEN** tenta-se inserir tenant com `status` diferente de 'active' ou 'inactive'
- **THEN** o banco retorna erro de violação de CHECK constraint

### Requirement: Coluna tenant_id em tabelas de dados
O sistema SHALL adicionar coluna `tenant_id UUID NOT NULL REFERENCES tenants(id)` nas tabelas: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `category_overrides`, `transactions_enriched`.

#### Scenario: Insert sem tenant_id
- **WHEN** tenta-se inserir em qualquer tabela de dados sem `tenant_id`
- **THEN** o banco retorna erro de NOT NULL constraint

#### Scenario: tenant_id com FK inválido
- **WHEN** tenta-se inserir com `tenant_id` que não existe em `tenants`
- **THEN** o banco retorna erro de violação de FK constraint

### Requirement: Row Level Security habilitado em tabelas de dados
O sistema SHALL habilitar RLS com `ENABLE ROW LEVEL SECURITY` e criar política `tenant_isolation` em cada tabela de dados. A política SHALL usar `USING (tenant_id = current_setting('app.tenant_id', true)::UUID)`.

#### Scenario: Query com contexto de tenant ativo
- **WHEN** `SET LOCAL app.tenant_id = '<uuid>'` está ativo na transação
- **THEN** apenas linhas com `tenant_id = <uuid>` são retornadas ou afetadas

#### Scenario: Query sem contexto de tenant
- **WHEN** nenhum `SET LOCAL app.tenant_id` está ativo
- **THEN** nenhuma linha é retornada (USING falha para todas — `current_setting` retorna NULL, `NULL::UUID != qualquer_uuid`)

#### Scenario: DELETE com contexto ativo
- **WHEN** `DELETE FROM transactions_enriched` é executado com `SET LOCAL app.tenant_id = '<uuid>'` ativo
- **THEN** apenas linhas do tenant `<uuid>` são deletadas

### Requirement: enrich_jobs e workers sem RLS
O sistema SHALL NOT habilitar RLS nas tabelas `enrich_jobs` e `workers`. Processos internos (supervisor, workers) precisam enxergar todos os tenants para distribuição de trabalho.

#### Scenario: Select em enrich_jobs sem contexto de tenant
- **WHEN** `SELECT * FROM enrich_jobs WHERE status = 'pending'` é executado sem `SET LOCAL`
- **THEN** jobs de todos os tenants são retornados
