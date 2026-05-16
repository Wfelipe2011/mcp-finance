### Requirement: GET /api/admin/tenants lista todos os tenants
O sistema SHALL ter endpoint `GET /api/admin/tenants` protegido por `requireSuperAdmin` que retorna array com todos os tenants. O response SHALL omitir campos sensíveis (`password_hash`, `pluggy_password`). Os campos retornados são: `id`, `name`, `email`, `status`, `created_at`, `last_login_at`.

#### Scenario: Listagem com token super admin válido
- **WHEN** `GET /api/admin/tenants` é chamado com JWT `role: super_admin` válido
- **THEN** retorna 200 com array de tenants (pode ser vazio `[]`)

#### Scenario: Listagem sem token
- **WHEN** `GET /api/admin/tenants` é chamado sem header Authorization
- **THEN** retorna 401 Unauthorized

#### Scenario: Listagem com token de tenant regular
- **WHEN** `GET /api/admin/tenants` é chamado com JWT de tenant (sem `role: super_admin`)
- **THEN** retorna 403 Forbidden

### Requirement: POST /api/admin/tenants cria novo tenant
O sistema SHALL ter endpoint `POST /api/admin/tenants` protegido por `requireSuperAdmin` que cria um novo tenant. Os campos obrigatórios são `name`, `email`, `password`. Os campos opcionais são `pluggy_email` e `pluggy_password`. O sistema SHALL gerar o `password_hash` com bcrypt (custo 10). O tenant criado SHALL ter `status = 'active'` por padrão.

#### Scenario: Criação com campos obrigatórios
- **WHEN** `POST /api/admin/tenants { name, email, password }` com auth super admin
- **THEN** retorna 201 com o tenant criado (sem password_hash): `id`, `name`, `email`, `status`, `created_at`, `last_login_at`

#### Scenario: Criação com campos opcionais
- **WHEN** `POST /api/admin/tenants { name, email, password, pluggy_email, pluggy_password }` com auth super admin
- **THEN** retorna 201 com tenant criado; `pluggy_email` e `pluggy_password` são armazenados mas não retornados

#### Scenario: Campo obrigatório ausente
- **WHEN** `POST /api/admin/tenants` é chamado sem `email`
- **THEN** retorna 400 com `{ error: "..." }`

#### Scenario: Email duplicado
- **WHEN** `POST /api/admin/tenants` é chamado com email já cadastrado
- **THEN** retorna 409 com `{ error: "Email já cadastrado" }`

### Requirement: PATCH /api/admin/tenants/:id altera status do tenant
O sistema SHALL ter endpoint `PATCH /api/admin/tenants/:id` protegido por `requireSuperAdmin` que altera o `status` de um tenant. O sistema SHALL aceitar os valores `active`, `suspended` e `inactive` (onde `inactive` é tratado como alias de `suspended`). O sistema SHALL retornar 400 para valores de status inválidos.

#### Scenario: Suspender tenant
- **WHEN** `PATCH /api/admin/tenants/:id { status: "suspended" }` com auth super admin
- **THEN** retorna 200 com tenant atualizado onde `status = "suspended"`

#### Scenario: Ativar tenant suspenso
- **WHEN** `PATCH /api/admin/tenants/:id { status: "active" }` com auth super admin
- **THEN** retorna 200 com tenant atualizado onde `status = "active"`

#### Scenario: Status "inactive" como alias de "suspended"
- **WHEN** `PATCH /api/admin/tenants/:id { status: "inactive" }` com auth super admin
- **THEN** retorna 200 com tenant onde `status = "suspended"` (normalizado pelo servidor)

#### Scenario: Status inválido
- **WHEN** `PATCH /api/admin/tenants/:id { status: "banido" }` com auth super admin
- **THEN** retorna 400 com `{ error: "Status inválido" }`

#### Scenario: Tenant não encontrado
- **WHEN** `PATCH /api/admin/tenants/<uuid-inexistente>` com auth super admin
- **THEN** retorna 404 com `{ error: "Tenant não encontrado" }`
