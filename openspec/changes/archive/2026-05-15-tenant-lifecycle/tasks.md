## 1. BunPgAdapter — Métodos de tenant

- [x] 1.1 Adicionar `tenants.create(data)` em `BunPgAdapter`: recebe `{ name, email, password_hash, pluggy_email, pluggy_password }`, faz INSERT sem `SET LOCAL`, retorna `{ id, name, email, status, created_at }`. Em violação de UNIQUE em `email`, propaga erro para o handler capturar como 409.
- [x] 1.2 Adicionar `tenants.findAll()` em `BunPgAdapter`: SELECT `id, name, email, status, last_login_at` FROM `tenants` ORDER BY `last_login_at DESC NULLS LAST`. Sem `SET LOCAL`.
- [x] 1.3 Adicionar `tenants.updateStatus(id, status)` em `BunPgAdapter`: UPDATE `tenants SET status = $status WHERE id = $id` RETURNING `{ id, status }`. Retorna `null` se não encontrado.
- [x] ~~1.4 `tenants.updateLastLogin(id)`~~ — coberto por `multitenant-auth` task 2.2 (já inclui `UPDATE last_login_at` no handler de login)

## 2. Rota POST /api/admin/tenants

- [x] 2.1 Criar `src/application/web/routes/admin/tenants.ts` com handler `createTenant(req)`: valida presença de todos os 5 campos; faz `bcrypt.hash(password, 10)`; chama `db.tenants.create()`; captura erro de email duplicado e retorna 409; retorna 201 com campos não-sensíveis.
- [x] 2.2 Adicionar rota `POST /api/admin/tenants` no `router.ts`: verifica `role === 'super_admin'` via `req.adminRole` (ou equivalente do middleware); delega para handler.

## 3. Rota GET /api/admin/tenants

- [x] 3.1 Adicionar handler `listTenants(req)` no arquivo `tenants.ts`: chama `db.tenants.findAll()`; retorna 200 com o array.
- [x] 3.2 Adicionar rota `GET /api/admin/tenants` no `router.ts` com guard `role: 'super_admin'`.

## 4. Rota PATCH /api/admin/tenants/:id

- [x] 4.1 Adicionar handler `updateTenantStatus(req, id)` no arquivo `tenants.ts`: valida que `status` é `"active"` ou `"inactive"`; chama `db.tenants.updateStatus(id, status)`; retorna 404 se `null`; retorna 200 `{ id, status }`.
- [x] 4.2 Adicionar rota `PATCH /api/admin/tenants/:id` no `router.ts` com guard `role: 'super_admin'`, extraindo `id` da URL.

## 5. ~~Atualização de last_login_at no login~~

> **Nota:** Esta tarefa é coberta por `multitenant-auth` task 2.2, que já inclui `UPDATE tenants SET last_login_at = NOW()` no handler de login. Não duplicar.

## 6. Verificação

- [x] 6.1 Testar `POST /api/admin/tenants` com body completo: confirmar 201 + hash bcrypt no banco + pluggy_password em plaintext.
- [x] 6.2 Testar `POST /api/admin/tenants` com email duplicado: confirmar 409.
- [x] 6.3 Testar `GET /api/admin/tenants`: confirmar lista ordenada por `last_login_at DESC NULLS LAST`.
- [x] 6.4 Testar `PATCH /api/admin/tenants/:id`: confirmar ativação/desativação.
- [x] 6.5 Testar login de tenant: confirmar que `last_login_at` é atualizado imediatamente.
