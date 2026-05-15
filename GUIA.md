# Guia de Implementação — MVP Multi-Tenant

## Ordem de implementação

As changes têm dependências reais entre si. Siga esta sequência:

```
① multitenant-schema    ← fundação: tabelas, RLS, migração de dados
② multitenant-auth      ← login por tenant, JWT com tenant_id, TokenHttpAdapter
③ tenant-lifecycle      ← CRUD de tenants via super admin
④ worker-registry       ← super admin auth, CRUD workers, supervisor
⑤ enrich-queue          ← fila PostgreSQL, worker loop
⑥ digest-cron           ← cron 23:50, digest gate (leitura de ai_monthly_digest)
⑦ super-admin-panel     ← painel HTML+JS (consome APIs de ③ e ④)
```

> **Nota:** `multitenant-auth` pode ser implementado junto com ① em um único PR — são dois lados da mesma moeda. Mas as tasks estão separadas para clareza.

---

## Dependências entre changes

```
multitenant-schema
  └── multitenant-auth        (requer tabela tenants com email/password_hash)
        └── tenant-lifecycle  (requer login + JWT com tenant_id)
              └── super-admin-panel (requer CRUD de tenants e workers)
        └── enrich-queue      (requer BunPgAdapter(tenantId) + SET LOCAL)
  └── worker-registry         (requer tabelas workers + enrich_jobs)
        └── enrich-queue      (requer workers.findActive())
        └── super-admin-panel (requer CRUD de workers)
  └── digest-cron             (requer ai_monthly_digest com tenant_id)
```

---

## Change por change

### ① `multitenant-schema` — 37 tasks

**O que faz:** DDL de novas tabelas, tenant_id em todas as tabelas de dados, RLS, migração do tenant legado.

**Arquivos principais:**
- `src/infrastructure/db/schema.sql` — todas as DDLs mudam
- `src/infrastructure/db/gold-ai.sql` — `ai_transaction_insights` e `ai_monthly_digest` ganham `tenant_id` e novo PK
- `src/infrastructure/db/silver-dimensions.sql` — `d_users` → `tenant_members`
- `src/infrastructure/db/BunPgAdapter.ts` — TRUNCATE→DELETE, seed tenant_members
- `src/scripts/migrate-to-multitenant.ts` — script único de migração

**Ordem das tasks:**
1. Criar tabelas novas (`tenants`, `workers`, `enrich_jobs`)
2. Adicionar `tenant_id` em todas as tabelas de dados (incluindo `ai_transaction_insights`, `ai_monthly_digest`)
3. Substituir `d_users` por `tenant_members`
4. Habilitar RLS (todas as tabelas de dados + AI tables; **não** em `enrich_jobs` e `workers`)
5. Corrigir `TRUNCATE` → `DELETE`
6. Script de migração (cria tenant_id = 1 com dados do .env)
7. Verificação

---

### ② `multitenant-auth` — 33 tasks

**O que faz:** Login contra tabela `tenants` (bcrypt), JWT com `tenant_id`, BunPgAdapter recebe tenantId, TokenHttpAdapter busca credenciais Pluggy do banco.

**Arquivos principais:**
- `src/application/web/routes/auth.ts` — login reescrito (inclui UPDATE last_login_at)
- `src/application/web/auth-middleware.ts` — extrai tenant_id do JWT
- `src/application/web/server.ts` — passa tenantId para router
- `src/application/web/router.ts` — aceita tenantId, repassa para 13 handlers
- `src/infrastructure/db/BunPgAdapter.ts` — construtor com tenantId, SET LOCAL em sql.begin()
- `src/infrastructure/token/TokenHttpAdapter.ts` — busca pluggy_email/pluggy_password do banco
- `auth/app/src/controllers/token.controller.ts` — GET→POST /token

> **Nota:** O UPDATE de `last_login_at` é feito aqui (task 2.2). A change `tenant-lifecycle` não duplica isso.

---

### ③ `tenant-lifecycle` — ~18 tasks

**O que faz:** Endpoints CRUD de tenants via super admin (`POST`, `GET`, `PATCH /api/admin/tenants`).

**Arquivos principais:**
- `src/application/web/routes/admin/tenants.ts` — novo arquivo
- `src/application/web/router.ts` — 3 novas rotas
- `src/infrastructure/db/BunPgAdapter.ts` — `tenants.create()`, `tenants.findAll()`, `tenants.updateStatus()`

> **Depende de:** ① (tabela tenants) + ④ (middleware requireSuperAdmin).
> **Implementar após ④** por causa do middleware de auth super admin.

---

### ④ `worker-registry` — 19 tasks

**O que faz:** Super admin auth (POST /api/admin/login, JWT role:super_admin), CRUD de workers, processo supervisor.

**Arquivos principais:**
- `src/application/web/routes/admin/login.ts` — novo
- `src/application/web/routes/admin/workers.ts` — novo
- `src/application/web/auth-middleware.ts` — adiciona requireSuperAdmin
- `src/application/supervisor/supervisor.ts` — novo processo
- `docker-compose.yml` — serviço supervisor

> **Depende de:** ① (tabela workers).

---

### ⑤ `enrich-queue` — 24 tasks

**O que faz:** Enfileiramento de jobs no sync, worker loop com anti-monopolização, remoção do script enrich.ts.

**Arquivos principais:**
- `src/application/workers/enrich-worker.ts` — novo
- `src/application/web/routes/sync.ts` — adiciona enqueue após upsert
- `src/infrastructure/db/BunPgAdapter.ts` — métodos enrich_jobs.*
- `src/scripts/enrich.ts` — removido

> **Depende de:** ① (tabela enrich_jobs) + ② (BunPgAdapter com tenantId) + ④ (workers.findActive() no supervisor).

---

### ⑥ `digest-cron` — 15 tasks

**O que faz:** Cron às 23:50, GET /api/digest lê ai_monthly_digest sem chamar AI, remoção do script digest.ts.

**Arquivos principais:**
- `src/application/cron/digest-cron.ts` — novo
- `src/application/web/routes/digest.ts` — simplificado para leitura
- `src/infrastructure/db/BunPgAdapter.ts` — getDigestCoverage, getDigestData, upsertDigest
- `src/scripts/digest.ts` — removido

> **Depende de:** ① (`ai_monthly_digest` com tenant_id) + ② (BunPgAdapter com tenantId).
> **Tabela correta:** `ai_monthly_digest` (não `ai_digests` — que não existe).

---

### ⑦ `super-admin-panel` — 15 tasks

**O que faz:** Painel HTML+JS vanilla em `GET /admin`. Zero toque no bundle React.

**Arquivos principais:**
- `src/application/web/routes/admin/panel.ts` — novo
- `src/application/web/router.ts` — rota GET /admin

> **Depende de:** ③ (API tenants) + ④ (API workers + login super admin).
> **Pode ser a última change implementada** — é apenas UI sobre APIs existentes.

---

## Brechas corrigidas (auditoria 2026-05-15)

| # | Brecha | Correção |
|---|--------|----------|
| 1 | `ai_digests` não existe — tabela real é `ai_monthly_digest` | Corrigido em todos os artifacts de `digest-cron` |
| 2 | `ai_transaction_insights` e `ai_monthly_digest` sem `tenant_id`/RLS | Tasks 2.8, 2.9 e 4.4 adicionadas em `multitenant-schema` |
| 3 | `last_login_at` implementado em dois changes | Task 5.1 removida de `tenant-lifecycle`; fica em `multitenant-auth` task 2.2 |

---

## Sequência de bootstrap (primeiro deploy)

```bash
# 1. Subir apenas o banco
docker compose up -d postgres

# 2. Aplicar schema multi-tenant
bun run src/scripts/apply-schema.ts   # ou psql direto

# 3. Rodar migração de dados (cria tenant_id = 1 com dados do .env)
bun run src/scripts/migrate-to-multitenant.ts

# 4. Configurar .env (adicionar novas vars):
#    SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, APP_SECRET

# 5. Subir todos os serviços
docker compose up -d

# 6. Acessar /admin e criar workers via painel
```

> ⚠️ **Nunca subir todos os serviços antes da migração.** A API vai falhar porque os JWTs
> exigem `tenant_id` e os dados existentes ainda não têm a coluna populada.

---

## Arquivos tocados por múltiplas changes (risco de conflito)

| Arquivo | Changes que modificam |
|---------|----------------------|
| `src/infrastructure/db/BunPgAdapter.ts` | ①②③④⑤⑥ |
| `src/application/web/router.ts` | ②③④⑦ |
| `src/application/web/auth-middleware.ts` | ②④ |
| `src/application/web/routes/auth.ts` | ② |
| `src/infrastructure/db/schema.sql` | ① |
| `src/infrastructure/db/gold-ai.sql` | ① |
| `docker-compose.yml` | ④⑥ |
| `package.json` | ④⑤⑥ |

> Implementar em ordem evita conflitos — cada change é um PR sobre o anterior.
