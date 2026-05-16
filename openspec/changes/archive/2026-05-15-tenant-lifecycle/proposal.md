## Why

Com o schema multi-tenant definido (`multitenant-schema`) e autenticação por JWT com `tenant_id` (`multitenant-auth`), ainda não existe um fluxo para criar e gerenciar tenants. O super admin precisa de endpoints para provisionar novas famílias e controlar acesso (ativar/desativar), além de `last_login_at` para monitoramento.

## What Changes

- Adiciona endpoints `POST /api/admin/tenants`, `GET /api/admin/tenants`, `PATCH /api/admin/tenants/:id` — protegidos por `role: 'super_admin'`
- Criação de tenant exige todos os campos: `name`, `email`, `password`, `pluggy_email`, `pluggy_password` — sem estado "incompleto"
- `password` é armazenado como hash bcrypt; `pluggy_password` em plaintext (MVP)
- `last_login_at` é atualizado de forma síncrona no endpoint `POST /api/auth/login` (já em `multitenant-auth`) — não é responsabilidade deste change
- Novos métodos em `BunPgAdapter`: `tenants.create()`, `tenants.findAll()`, `tenants.updateStatus()`
- Rota `GET /api/admin/tenants` retorna: `id`, `name`, `email`, `status`, `last_login_at` — apenas metadados, sem dados financeiros

## Capabilities

### New Capabilities

- `tenant-crud`: Endpoints CRUD de tenants via super admin — criar, listar, ativar/desativar. Inclui validação de campos obrigatórios, unicidade de email e hash de senha.

### Modified Capabilities

- `tenant-isolation`: Adiciona `last_login_at` como campo gerenciado — o schema já o tem mas o lifecycle de atualização é definido aqui.

## Impact

- `src/application/web/routes/admin/tenants.ts` — novo arquivo com 3 handlers
- `src/application/web/router.ts` — adiciona 3 novas rotas ao router principal
- `src/infrastructure/db/BunPgAdapter.ts` — novos métodos `tenants.create()`, `tenants.findAll()`, `tenants.updateStatus()`
- Depende de: `multitenant-schema` (tabela `tenants`), `worker-registry` (middleware super admin auth)
- Sem novas dependências de pacotes — bcrypt já adicionado em `multitenant-auth`
