## 1. BunPgAdapter — métodos de tenants

- [x] 1.1 Adicionar interface `TenantRow` ao `BunPgAdapter.ts`: campos `id`, `name`, `email`, `status`, `created_at`, `last_login_at` (sem password_hash/pluggy_*)
- [x] 1.2 Adicionar property `readonly tenants` ao `BunPgAdapter` com métodos `findAll()`, `create(data)`, `setStatus(id, status)`
- [x] 1.3 Implementar `tenants.findAll()` — `SELECT id, name, email, status, created_at, last_login_at FROM tenants ORDER BY created_at DESC`
- [x] 1.4 Implementar `tenants.create(data)` — hash bcrypt (custo 10) da senha, INSERT em tenants, retorna TenantRow
- [x] 1.5 Implementar `tenants.setStatus(id, status)` — UPDATE tenants SET status = $status WHERE id = $id, retorna TenantRow ou null se não encontrado

## 2. Handler dos endpoints de tenants

- [x] 2.1 Criar `src/application/web/routes/admin/tenants.ts` com imports de `requireSuperAdmin`, `BunPgAdapter`, `jsonResponse`, `errorResponse`
- [x] 2.2 Implementar `handleListTenants(req)` — chama `requireSuperAdmin`, retorna `db.tenants.findAll()` como JSON 200
- [x] 2.3 Implementar `handleCreateTenant(req)` — valida campos obrigatórios (name, email, password), chama `db.tenants.create()`, retorna 201; trata email duplicado → 409
- [x] 2.4 Implementar `handleToggleTenantStatus(req, url)` — extrai id da URL, normaliza `inactive → suspended`, valida status, chama `db.tenants.setStatus()`, retorna 200 ou 404

## 3. Rotas no router.ts

- [x] 3.1 Adicionar import de `handleListTenants`, `handleCreateTenant`, `handleToggleTenantStatus` do `routes/admin/tenants.ts`
- [x] 3.2 Adicionar rota `GET /api/admin/tenants` → `handleListTenants(req)`
- [x] 3.3 Adicionar rota `POST /api/admin/tenants` → `handleCreateTenant(req)`
- [x] 3.4 Adicionar rota `PATCH /api/admin/tenants/:id` → `handleToggleTenantStatus(req, url)`

## 4. Verificação

- [x] 4.1 Testar `GET /api/admin/tenants` com super_admin token → retorna array
- [x] 4.2 Testar `POST /api/admin/tenants` cria tenant → aparece na listagem
- [x] 4.3 Testar `PATCH /api/admin/tenants/:id { status: "inactive" }` → status "suspended" no DB
- [x] 4.4 Testar `PATCH /api/admin/tenants/:id { status: "banido" }` → 400
- [x] 4.5 Re-executar testing gate de `super-admin-panel` e confirmar ✓ PASS em todas as assertions
