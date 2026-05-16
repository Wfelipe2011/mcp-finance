## ADDED Requirements

### Requirement: Login contra tabela tenants com bcrypt
O sistema SHALL autenticar usuários verificando `email` na tabela `tenants` e comparando a senha fornecida com `password_hash` via bcrypt. Após login bem-sucedido, SHALL atualizar `tenants.last_login_at = NOW()`. Tentativas com tenant `status = 'inactive'` SHALL ser rejeitadas com 401.

#### Scenario: Login bem-sucedido
- **WHEN** `POST /api/auth/login` recebe `{ email, password }` com credenciais válidas de tenant ativo
- **THEN** retorna `{ token }` com JWT contendo `{ sub: email, tenant_id: uuid, tenant_name: text }` e atualiza `last_login_at`

#### Scenario: Email não encontrado
- **WHEN** `POST /api/auth/login` recebe email que não existe em `tenants`
- **THEN** retorna 401 com `{ error: "Credenciais inválidas" }` (sem revelar se email existe)

#### Scenario: Senha incorreta
- **WHEN** `POST /api/auth/login` recebe email válido mas senha errada
- **THEN** retorna 401 com `{ error: "Credenciais inválidas" }`

#### Scenario: Tenant inativo
- **WHEN** `POST /api/auth/login` recebe credenciais válidas de tenant com `status = 'inactive'`
- **THEN** retorna 401 com `{ error: "Credenciais inválidas" }`

### Requirement: JWT contém tenant_id
O sistema SHALL emitir JWT com payload incluindo `sub` (email), `tenant_id` (UUID do tenant) e `tenant_name` (nome do tenant). O middleware `verifyAuth` SHALL extrair `tenant_id` do payload e retorná-lo junto com a validação.

#### Scenario: Request autenticado com JWT válido
- **WHEN** request inclui `Authorization: Bearer <token>` com JWT válido e não expirado
- **THEN** `verifyAuth` retorna `{ valid: true, tenantId: "<uuid>" }`

#### Scenario: JWT sem tenant_id (token legado)
- **WHEN** request inclui JWT válido mas sem campo `tenant_id` no payload
- **THEN** `verifyAuth` retorna `{ valid: false }` com 401

### Requirement: BunPgAdapter scoped por tenant
O sistema SHALL instanciar `BunPgAdapter` com `tenantId` e executar `SET LOCAL app.tenant_id = ${tenantId}` como primeira instrução em todo `sql.begin()`. Queries diretas (`sql\`...\``) fora de transações SHALL ser convertidas para `sql.begin()` quando acessam tabelas com RLS.

#### Scenario: Query dentro de transação com tenantId
- **WHEN** `BunPgAdapter` com `tenantId` executa qualquer método de escrita ou leitura
- **THEN** o `SET LOCAL app.tenant_id` é emitido antes da query, garantindo isolamento via RLS

#### Scenario: Instanciação sem tenantId
- **WHEN** `new BunPgAdapter()` sem argumento (workers, cron)
- **THEN** nenhum `SET LOCAL` é emitido — o adapter opera sem contexto de tenant (apenas para tabelas sem RLS como `enrich_jobs` e `workers`)
