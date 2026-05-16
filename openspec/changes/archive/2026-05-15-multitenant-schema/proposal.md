## Why

O sistema é single-tenant: um banco de dados compartilhado sem isolamento entre famílias. Para suportar múltiplos tenants (famílias) com segurança, precisamos adicionar isolamento no nível do banco de dados via Row Level Security (RLS) no PostgreSQL, garantindo que dados de uma família nunca vazem para outra.

## What Changes

- **BREAKING** Adiciona coluna `tenant_id UUID` em todas as tabelas de dados: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `category_overrides`, `transactions_enriched`
- Cria tabela `tenants` — registro de cada família (credenciais de app + credenciais Pluggy)
- **BREAKING** Substitui `d_users` por `tenant_members` — membros scoped por tenant com UNIQUE `(tenant_id, name)`
- Cria tabela `enrich_jobs` — fila de processamento AI com suporte a ordenação por data e anti-monopolização de tenant
- Cria tabela `workers` — registro de modelos de AI configurados para processar a fila
- Habilita RLS em todas as tabelas de dados; políticas usam `current_setting('app.tenant_id')`
- `enrich_jobs` e `workers` ficam **sem** RLS — o supervisor e a cron precisam enxergar todos os tenants
- Substitui `TRUNCATE transactions_enriched` por `DELETE FROM transactions_enriched` (TRUNCATE ignora RLS)
- Remove as 3 linhas seed globais de `category_overrides` (AWS/OpenRouter/Neon) — overrides passam a ser por tenant

## Capabilities

### New Capabilities

- `tenant-isolation`: Tabela `tenants`, coluna `tenant_id` em todas as tabelas de dados, políticas RLS via `current_setting('app.tenant_id')`
- `tenant-members`: Tabela `tenant_members` substituindo `d_users`, com UNIQUE `(tenant_id, name)` e seed automático via sync
- `enrich-jobs-table`: Tabela `enrich_jobs` com estados `pending/processing/done/error`, suporte a `FOR UPDATE SKIP LOCKED`, índice em `(status, tenant_id, date DESC)`
- `workers-table`: Tabela `workers` com configuração de modelo AI (`ai_base_url`, `ai_api_key`, `ai_model`), controle de status e contadores de jobs

### Modified Capabilities

- `db-schema`: A estrutura de todas as tabelas muda com adição de `tenant_id`; seed de `d_users` e `category_overrides` removido/alterado

## Impact

- `src/infrastructure/db/schema.sql` — todas as DDLs de tabela mudam
- `src/infrastructure/db/silver-dimensions.sql` — `d_users` substituído por `tenant_members`
- `src/infrastructure/db/silver-facts.sql` — JOINs com `d_users` atualizados para `tenant_members`
- `src/infrastructure/db/BunPgAdapter.ts` — `TRUNCATE` → `DELETE`, seed de `d_users` atualizado para `tenant_members`
- PostgreSQL 16 com RLS nativo — sem dependência nova de runtime
- Migração necessária para dados existentes (assignment de `tenant_id` nos dados atuais)
