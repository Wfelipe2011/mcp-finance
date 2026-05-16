## ADDED Requirements

### Requirement: Todas as rotas recebem tenantId do middleware
O sistema SHALL propagar `tenantId` do middleware `verifyAuth` para o `router` e de lá para cada handler de rota. Todos os handlers SHALL criar `BunPgAdapter(tenantId)` em vez de `BunPgAdapter()`.

#### Scenario: Request autenticado em rota de dados
- **WHEN** `GET /api/cashflow` recebe JWT válido com `tenant_id`
- **THEN** o handler recebe `tenantId`, cria `BunPgAdapter(tenantId)` e retorna apenas dados do tenant correto

#### Scenario: Request com JWT sem tenant_id
- **WHEN** qualquer rota protegida recebe JWT sem `tenant_id` no payload
- **THEN** o middleware retorna 401 antes de o handler ser chamado

### Requirement: TokenHttpAdapter busca credenciais do banco por tenant
O sistema SHALL ter `TokenHttpAdapter` que, ao ser chamado para buscar o Pluggy access token, primeiro consulta `SELECT pluggy_email, pluggy_password FROM tenants WHERE id = $tenantId` e então chama `POST http://auth:3000/token { email, appPassword }`.

#### Scenario: Token Pluggy com cache válido
- **WHEN** `TokenHttpAdapter(tenantId)` é chamado e a sessão Pluggy do tenant ainda está válida (< 24h)
- **THEN** o auth service retorna o token cacheado sem executar browser automation

#### Scenario: Token Pluggy expirado ou inexistente
- **WHEN** `TokenHttpAdapter(tenantId)` é chamado e não há sessão válida para o tenant
- **THEN** o auth service executa browser automation com as credenciais recebidas e retorna novo token

### Requirement: Tenant não encontrado no banco para token
Se o `tenantId` do JWT não existir mais na tabela `tenants`, o sistema SHALL retornar 401.

#### Scenario: Tenant deletado após emissão do JWT
- **WHEN** request autenticado com JWT válido mas `tenant_id` não existe mais em `tenants`
- **THEN** o sistema retorna 401 com `{ error: "Tenant não encontrado" }`
