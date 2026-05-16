## 1. Novas Tabelas Base

- [x] 1.1 Criar tabela `tenants` em `schema.sql` com todos os campos definidos (id UUID, name, email UNIQUE, password_hash, pluggy_email, pluggy_password, status CHECK, created_at, last_login_at)
- [x] 1.2 Criar tabela `workers` em `schema.sql` com todos os campos (id UUID, name, ai_base_url, ai_api_key, ai_model, status CHECK, error_count, last_error, jobs_done, last_seen_at, created_at)
- [x] 1.3 Criar tabela `enrich_jobs` em `schema.sql` com todos os campos (id BIGSERIAL, tenant_id FK, transaction_id UNIQUE, date, status CHECK, attempts, worker_id FK, started_at, finished_at, error_msg, created_at)
- [x] 1.4 Criar índice `(status, tenant_id, date DESC)` em `enrich_jobs`

## 2. Adicionar tenant_id nas Tabelas de Dados

- [x] 2.1 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `items`
- [x] 2.2 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `accounts`
- [x] 2.3 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `transactions`
- [x] 2.4 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `investments`
- [x] 2.5 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `investment_transactions`
- [x] 2.6 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `category_overrides` e remover 3 linhas seed globais (AWS/OpenRouter/Neon)
- [x] 2.7 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `transactions_enriched`
- [x] 2.8 Adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` em `ai_transaction_insights` (arquivo `gold-ai.sql`); alterar PK de `transaction_id` para manter unicidade por `(tenant_id, transaction_id)`
- [x] 2.9 Alterar PK de `ai_monthly_digest` de `(year, month)` para `(tenant_id, year, month)` e adicionar `tenant_id UUID NOT NULL REFERENCES tenants(id)` (arquivo `gold-ai.sql`)

## 3. Substituir d_users por tenant_members

- [x] 3.1 Criar tabela `tenant_members` em `schema.sql` (id SERIAL, tenant_id FK, name TEXT, display_name TEXT, UNIQUE (tenant_id, name))
- [x] 3.2 Remover DDL de `d_users` de `schema.sql` e `silver-dimensions.sql`
- [x] 3.3 Atualizar seed de `tenant_members` no `BunPgAdapter.ts` — `INSERT INTO tenant_members (tenant_id, name, display_name) ... ON CONFLICT (tenant_id, name) DO NOTHING`
- [x] 3.4 Atualizar JOINs em `silver-facts.sql` de `d_users` para `tenant_members`
- [x] 3.5 Atualizar JOINs em `silver-dimensions.sql` de `d_users` para `tenant_members`

## 4. Row Level Security

- [x] 4.1 Habilitar `ENABLE ROW LEVEL SECURITY` em `items`, `accounts`, `transactions`
- [x] 4.2 Habilitar `ENABLE ROW LEVEL SECURITY` em `investments`, `investment_transactions`, `category_overrides`, `transactions_enriched`
- [x] 4.3 Habilitar `ENABLE ROW LEVEL SECURITY` em `tenant_members`
- [x] 4.4 Habilitar `ENABLE ROW LEVEL SECURITY` em `ai_transaction_insights` e `ai_monthly_digest`
- [x] 4.5 Criar política `tenant_isolation` em cada tabela com `USING (tenant_id = current_setting('app.tenant_id', true)::UUID)`
- [x] 4.6 Confirmar que `enrich_jobs` e `workers` NÃO têm RLS habilitado

## 5. Corrigir TRUNCATE → DELETE

- [x] 5.1 Localizar o `TRUNCATE transactions_enriched` no `BunPgAdapter.ts`
- [x] 5.2 Substituir por `DELETE FROM transactions_enriched` (RLS garante escopo por tenant)
- [x] 5.3 Verificar que não há outros `TRUNCATE` no codebase (`grep -r TRUNCATE src/`)

## 6. Script de Migração

- [x] 6.1 Criar script `src/scripts/migrate-to-multitenant.ts` que lê env vars atuais e cria o tenant inicial
- [x] 6.2 O script deve executar `UPDATE <tabela> SET tenant_id = '<uuid>' WHERE tenant_id IS NULL` em todas as tabelas de dados (incluindo `ai_transaction_insights` e `ai_monthly_digest`)
- [x] 6.3 Testar script em banco de desenvolvimento antes de aplicar em produção
- [x] 6.4 Documentar no README como executar a migração

## 7. Verificação

- [x] 7.1 Testar que `SELECT * FROM transactions` sem `SET LOCAL` retorna zero linhas (RLS ativo)
- [x] 7.2 Testar que `SELECT * FROM transactions` com `SET LOCAL app.tenant_id = '<uuid>'` retorna apenas dados do tenant correto
- [x] 7.3 Testar que `DELETE FROM transactions_enriched` com `SET LOCAL` não apaga dados de outros tenants
- [x] 7.4 Testar que `SELECT * FROM enrich_jobs` sem `SET LOCAL` retorna todos os jobs (sem RLS)
- [x] 7.5 Testar que `SELECT * FROM f_transacoes` com `SET LOCAL` retorna apenas dados do tenant via RLS em cascade nas views
