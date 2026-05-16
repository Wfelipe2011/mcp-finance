## MODIFIED Requirements

### Requirement: Tabela tenants
O campo `last_login_at` SHALL ser atualizado de forma síncrona no endpoint `POST /api/auth/login`, imediatamente antes de retornar o JWT. O `BunPgAdapter` SHALL expor métodos `tenants.create(data)`, `tenants.findAll()`, e `tenants.updateStatus(id, status)` que operam **sem** `SET LOCAL app.tenant_id` (tabela `tenants` não tem RLS — super admin enxerga todos os tenants).

#### Scenario: last_login_at atualizado no login
- **WHEN** `POST /api/auth/login { email, password }` autentica com sucesso
- **THEN** `tenants.last_login_at` é atualizado para `NOW()` na mesma transação antes de retornar o token

#### Scenario: BunPgAdapter.tenants.create sem RLS
- **WHEN** `tenants.create({ name, email, password_hash, pluggy_email, pluggy_password })` é chamado
- **THEN** INSERT ocorre sem `SET LOCAL` — tabela `tenants` não tem RLS policy
