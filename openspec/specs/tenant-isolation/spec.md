## Requirements

### Requirement: Tabela tenants
O sistema SHALL ter tabela `tenants` com campos: `id` (UUID PK, default `gen_random_uuid()`), `name` (TEXT NOT NULL — ex: "Família Silva"), `email` (TEXT NOT NULL UNIQUE — login no app), `password_hash` (TEXT NOT NULL — bcrypt), `pluggy_email` (TEXT — conta Pluggy da família), `pluggy_password` (TEXT — senha Pluggy), `status` (TEXT NOT NULL DEFAULT 'active', CHECK em `active`/`suspended`), `created_at` (TIMESTAMP DEFAULT now()), `last_login_at` (TIMESTAMP NULL).

#### Scenario: Criação de tenant
- **WHEN** um novo tenant é inserido com email único
- **THEN** o registro é criado com `status='active'`, `created_at=now()` e `last_login_at=NULL`

#### Scenario: Email duplicado
- **WHEN** tenta-se inserir um tenant com email já existente
- **THEN** o banco retorna erro de violação de UNIQUE constraint

#### Scenario: Status inválido
- **WHEN** tenta-se inserir tenant com `status` diferente de 'active' ou 'suspended'
- **THEN** o banco retorna erro de violação de CHECK constraint

### Requirement: Coluna tenant_id em tabelas de dados
O sistema SHALL adicionar coluna `tenant_id UUID NOT NULL REFERENCES tenants(id)` nas tabelas: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `category_overrides`, `transactions_enriched`, `tenant_members`, `ai_transaction_insights`, `ai_monthly_digest`.

#### Scenario: Insert sem tenant_id
- **WHEN** tenta-se inserir em qualquer tabela de dados sem `tenant_id`
- **THEN** o banco retorna erro de NOT NULL constraint

#### Scenario: tenant_id com FK inválido
- **WHEN** tenta-se inserir com `tenant_id` que não existe em `tenants`
- **THEN** o banco retorna erro de violação de FK constraint

### Requirement: Row Level Security habilitado em tabelas de dados
O sistema SHALL habilitar RLS com `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` e criar política `tenant_isolation` em cada tabela de dados. A política SHALL usar `USING (tenant_id = current_setting('app.tenant_id', true)::UUID)`.

#### Scenario: Query com contexto de tenant ativo
- **WHEN** `SET LOCAL app.tenant_id = '<uuid>'` está ativo na transação
- **THEN** apenas linhas com `tenant_id = <uuid>` são retornadas ou afetadas

#### Scenario: Query sem contexto de tenant
- **WHEN** nenhum `SET LOCAL app.tenant_id` está ativo
- **THEN** nenhuma linha é retornada (USING falha para todas)

#### Scenario: DELETE com contexto ativo
- **WHEN** `DELETE FROM transactions_enriched` é executado com `SET LOCAL app.tenant_id = '<uuid>'` ativo
- **THEN** apenas linhas do tenant `<uuid>` são deletadas

### Requirement: enrich_jobs e workers sem RLS
O sistema SHALL NOT habilitar RLS nas tabelas `enrich_jobs` e `workers`. Processos internos (supervisor, workers) precisam enxergar todos os tenants para distribuição de trabalho.

#### Scenario: Select em enrich_jobs sem contexto de tenant
- **WHEN** `SELECT * FROM enrich_jobs WHERE status = 'pending'` é executado sem `SET LOCAL`
- **THEN** jobs de todos os tenants são retornados

### Requirement: Role da aplicação sem BYPASSRLS
O role `finance` usado pela aplicação SHALL ter `NOSUPERUSER NOBYPASSRLS` para que as políticas RLS sejam aplicadas em todas as operações DML.

#### Scenario: finance user conecta e faz SELECT sem contexto
- **WHEN** `finance` conecta e executa `SELECT * FROM transactions` sem `SET LOCAL`
- **THEN** zero linhas são retornadas (RLS bloqueia tudo)

### Requirement: Views com security_invoker
Todas as views silver e gold SHALL ser criadas com `WITH (security_invoker = true)` para que o RLS seja avaliado usando as credenciais do usuário que chama a view, não do dono da view.

### Requirement: BunPgAdapter.tenants sem SET LOCAL
O `BunPgAdapter` SHALL expor métodos `tenants.create(data)`, `tenants.findAll()`, e `tenants.updateStatus(id, status)` que operam **sem** `SET LOCAL app.tenant_id` (tabela `tenants` não tem RLS — super admin enxerga todos os tenants). O campo `last_login_at` SHALL ser atualizado de forma síncrona no endpoint `POST /api/auth/login`, imediatamente antes de retornar o JWT.

#### Scenario: last_login_at atualizado no login
- **WHEN** `POST /api/auth/login { email, password }` autentica com sucesso
- **THEN** `tenants.last_login_at` é atualizado para `NOW()` na mesma transação antes de retornar o token

#### Scenario: BunPgAdapter.tenants.create sem RLS
- **WHEN** `tenants.create({ name, email, password_hash, pluggy_email, pluggy_password })` é chamado
- **THEN** INSERT ocorre sem `SET LOCAL` — tabela `tenants` não tem RLS policy

#### Scenario: SELECT em f_transacoes com tenant ativo
- **WHEN** `SELECT * FROM f_transacoes` é executado com `SET LOCAL app.tenant_id` ativo pelo role `finance`
- **THEN** apenas transações do tenant corrente aparecem no resultado
