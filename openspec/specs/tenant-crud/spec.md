### Requirement: POST /api/admin/tenants cria tenant com campos obrigatórios
O sistema SHALL ter endpoint `POST /api/admin/tenants` protegido por JWT com `role: 'super_admin'`. O body SHALL conter `name`, `email`, `password`, `pluggy_email`, `pluggy_password` — todos obrigatórios. O `password` SHALL ser armazenado como hash bcrypt. O `pluggy_password` SHALL ser armazenado em plaintext. A resposta de sucesso SHALL ser `201 { id, name, email, status, created_at }` — sem campos sensíveis.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /api/admin/tenants` com body completo e auth super admin
- **THEN** retorna `201 { id, name, email, status: "active", created_at }`

#### Scenario: Campo obrigatório ausente
- **WHEN** `POST /api/admin/tenants` sem `pluggy_email`
- **THEN** retorna `400 { error: "Campos obrigatórios: name, email, password, pluggy_email, pluggy_password" }`

#### Scenario: Email duplicado
- **WHEN** `POST /api/admin/tenants` com email já existente
- **THEN** retorna `409 { error: "Email já cadastrado" }`

#### Scenario: Sem autenticação super admin
- **WHEN** `POST /api/admin/tenants` sem JWT ou com JWT de tenant regular
- **THEN** retorna `403 Forbidden`

### Requirement: GET /api/admin/tenants lista todos os tenants
O sistema SHALL ter endpoint `GET /api/admin/tenants` protegido por JWT com `role: 'super_admin'` que retorna array com todos os tenants. Cada item SHALL conter `id`, `name`, `email`, `status`, `last_login_at`. SHALL ordenar por `last_login_at DESC NULLS LAST`.

#### Scenario: Listagem com múltiplos tenants
- **WHEN** `GET /api/admin/tenants` com auth super admin e existem 3 tenants
- **THEN** retorna array com os 3 tenants ordenados por último login

#### Scenario: Listagem vazia
- **WHEN** `GET /api/admin/tenants` sem tenants cadastrados
- **THEN** retorna `[]`

### Requirement: PATCH /api/admin/tenants/:id altera status do tenant
O sistema SHALL ter endpoint `PATCH /api/admin/tenants/:id` protegido por JWT com `role: 'super_admin'` que aceita `{ status: "active" | "inactive" }`. Somente o campo `status` é modificável. SHALL retornar `200 { id, status }` após atualização.

#### Scenario: Desativação de tenant
- **WHEN** `PATCH /api/admin/tenants/:id { status: "inactive" }` com auth super admin
- **THEN** retorna `200 { id, status: "inactive" }`

#### Scenario: Tenant não encontrado
- **WHEN** `PATCH /api/admin/tenants/uuid-inexistente { status: "inactive" }`
- **THEN** retorna `404 { error: "Tenant não encontrado" }`

#### Scenario: Status inválido
- **WHEN** `PATCH /api/admin/tenants/:id { status: "suspended" }`
- **THEN** retorna `400 { error: "Status deve ser active ou inactive" }`
