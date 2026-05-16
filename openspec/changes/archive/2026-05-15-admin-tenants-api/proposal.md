## Why

O testing gate do `super-admin-panel` revelou FAIL: os endpoints `/api/admin/tenants` (GET, POST, PATCH) não existem no backend. O painel HTML já os chama corretamente — só falta a implementação server-side para a change `super-admin-panel` passar no gate.

## What Changes

- Criar `src/application/web/routes/admin/tenants.ts` com 3 handlers protegidos por `requireSuperAdmin`:
  - `handleListTenants` — `GET /api/admin/tenants` → lista todos os tenants (id, name, email, status, last_login_at)
  - `handleCreateTenant` — `POST /api/admin/tenants` → cria tenant com name, email, password, pluggy_email, pluggy_password
  - `handleToggleTenantStatus` — `PATCH /api/admin/tenants/:id` → atualiza status do tenant (active/inactive)
- Adicionar as 3 rotas ao `router.ts`

## Capabilities

### New Capabilities

- `admin-tenants-crud`: Endpoints REST para gerenciamento de tenants via super admin (listar, criar, ativar/desativar)

### Modified Capabilities

- `super-admin-panel`: Adicionar delta spec com os scenarios de tenants que agora têm backend implementado

## Impact

- `src/application/web/routes/admin/tenants.ts` — arquivo novo
- `src/application/web/router.ts` — 3 novas rotas
- `src/infrastructure/db/BunPgAdapter.ts` — métodos `tenants.findAll()`, `tenants.create()`, `tenants.setStatus()` (se não existirem)
- Resolve FAIL no testing gate de `super-admin-panel`
