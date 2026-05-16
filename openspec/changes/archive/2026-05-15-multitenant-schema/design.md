## Context

O sistema atual é single-tenant: todas as tabelas de dados (`items`, `accounts`, `transactions`, etc.) pertencem implicitamente a um único usuário configurado via env vars (`APP_USERNAME`). O banco é PostgreSQL 16. O `BunPgAdapter` usa `bun SQL` com tagged template literals e `sql.begin()` para todas as escritas.

O objetivo é suportar múltiplas famílias (tenants) no mesmo banco com isolamento total — dados de uma família jamais devem ser visíveis para outra.

## Goals / Non-Goals

**Goals:**
- Adicionar `tenant_id UUID` a todas as tabelas de dados
- Criar tabela `tenants` com credenciais da família (app + Pluggy)
- Substituir `d_users` por `tenant_members` com escopo por tenant
- Criar `enrich_jobs` como fila de processamento AI
- Criar `workers` como registro de modelos AI
- Habilitar RLS em todas as tabelas de dados via `current_setting('app.tenant_id')`
- Garantir que a troca de contexto de tenant dentro de uma transação seja automática e segura

**Non-Goals:**
- Criptografia das credenciais Pluggy (aceito como risco consciente no MVP)
- Refactor do `BunPgAdapter` para injetar `tenantId` (escopo do change `multitenant-auth`)
- UI/API de gestão de tenants (escopo do change `multitenant-auth`)
- Super admin panel (change separado)

## Decisions

### D1: Row Level Security (RLS) via `SET LOCAL app.tenant_id`

**Escolhido**: RLS no PostgreSQL com `current_setting('app.tenant_id')` definido no início de cada transação.

**Alternativas consideradas**:
- `WHERE tenant_id = ?` em cada query manualmente → propenso a erros, difícil de auditar, não escala
- Schema separado por tenant → complexidade operacional alta, difícil de migrar

**Rationale**: RLS é enforçado pelo banco, não pelo código de aplicação. Políticas simples com `current_setting` se aplicam automaticamente a todas as queries — incluindo views silver/gold — sem precisar modificar cada view. O único requisito é `SET LOCAL` dentro de `sql.begin()`.

**Política padrão:**
```sql
CREATE POLICY tenant_isolation ON <tabela>
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

O `true` como segundo argumento de `current_setting` evita erro quando a variável não está definida (retorna `NULL` em vez de lançar exceção).

### D2: `enrich_jobs` e `workers` ficam sem RLS

**Rationale**: O supervisor precisa listar todos os workers ativos. O worker process precisa ver todos os `enrich_jobs` de todos os tenants para fazer o sorteio anti-monopolização. RLS aqui quebraria a distribuição de trabalho entre tenants.

Segurança: o acesso a essas tabelas é feito apenas por processos internos (supervisor, workers), não pela API HTTP exposta aos usuários.

### D3: `TRUNCATE` → `DELETE` em `transactions_enriched`

**Rationale**: `TRUNCATE` ignora RLS no PostgreSQL. Com múltiplos tenants, `TRUNCATE transactions_enriched` apagaria dados de todas as famílias. `DELETE FROM transactions_enriched` respeita a política RLS quando `SET LOCAL app.tenant_id` está ativo, apagando apenas as linhas do tenant corrente.

### D4: `enrich_jobs` usa `FOR UPDATE SKIP LOCKED` + sorteio de tenant

**Rationale**: Múltiplos workers processam a fila em paralelo. `FOR UPDATE SKIP LOCKED` garante que dois workers não pegam o mesmo job. O sorteio por `RANDOM()` sobre tenants distintos com jobs pendentes garante que a Família Silva com 1000 jobs não monopolize todos os workers enquanto a Família Costa aguarda.

### D5: Migração single-tenant → multi-tenant atribui tenant_id pelo dado existente

**Rationale**: Os dados existentes pertencem ao único tenant atual. A migração cria o tenant a partir das env vars atuais e atribui seu `id` a todas as linhas existentes. Simples e não destrutivo.

## Risks / Trade-offs

- **`SET LOCAL` esquecido** → query sem contexto de tenant acessa todas as linhas via fallback de `NULL`. Mitigation: encapsular a injeção de `SET LOCAL` no adapter e cobrir com teste de integração.
- **TRUNCATE legado no código** → se algum código ainda usar `TRUNCATE`, vaza dados entre tenants. Mitigation: grep no codebase + test de regressão explícito.
- **`current_setting('app.tenant_id', true)` retorna NULL** quando nenhum contexto está ativo → a política USING bloqueia todas as linhas em vez de retornar erro explícito. Mitigation: aceitável para o MVP — o resultado visível é uma lista vazia, não um erro 500.
- **pluggy_password em plaintext** → risco de segurança aceito explicitamente para o MVP.

## Migration Plan

1. Aplicar DDL de criação das novas tabelas (`tenants`, `tenant_members`, `enrich_jobs`, `workers`)
2. Adicionar coluna `tenant_id UUID NULL` em todas as tabelas de dados (nullable para não quebrar dados existentes)
3. Criar um tenant inicial via script de migração usando `APP_USERNAME`/`APP_PASSWORD`/`PLUGGY_EMAIL`/`PLUGGY_PASSWORD` das env vars atuais
4. `UPDATE <tabela> SET tenant_id = '<uuid-do-tenant-inicial>'` em todas as tabelas
5. Alterar colunas `tenant_id` para `NOT NULL`
6. Criar políticas RLS e habilitar `ENABLE ROW LEVEL SECURITY`
7. Criar índices de suporte às novas queries

**Rollback**: As colunas `tenant_id` podem ser droppadas individualmente. As novas tabelas podem ser droppadas sem afetar dados existentes.

## Open Questions

- *(Resolvido)* Estratégia de isolamento: RLS via `SET LOCAL` ✓
- *(Resolvido)* Criptografia: sem criptografia no MVP ✓
- Como o `BunPgAdapter` vai receber o `tenantId` em runtime? → resolvido no change `multitenant-auth`
