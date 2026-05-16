## MODIFIED Requirements

### Requirement: Todas as rotas recebem tenantId do middleware
O sistema SHALL propagar `tenantId` do middleware `verifyAuth` para o `router` e de lá para cada handler de rota. Todos os handlers SHALL criar `BunPgAdapter(tenantId)` em vez de `BunPgAdapter()`.

Ao criar `BunPgAdapter(tenantId)`, o adapter SHALL incluir `tenant_id` explicitamente em todos os INSERTs das tabelas protegidas por RLS (`items`, `accounts`, `transactions`, `investments`, `investment_transactions`), garantindo que cada nova linha pertença ao tenant correto.

#### Scenario: Request autenticado em rota de dados
- **WHEN** `GET /api/cashflow` recebe JWT válido com `tenant_id`
- **THEN** o handler recebe `tenantId`, cria `BunPgAdapter(tenantId)` e retorna apenas dados do tenant correto

#### Scenario: Request com JWT sem tenant_id
- **WHEN** qualquer rota protegida recebe JWT sem `tenant_id` no payload
- **THEN** o middleware retorna 401 antes de o handler ser chamado

#### Scenario: Sync com tenant autenticado
- **WHEN** `POST /api/sync` é chamado com JWT válido de um tenant com credenciais Pluggy
- **THEN** o adapter insere `items`, `accounts`, `transactions`, `investments` e `investment_transactions` com o `tenant_id` correto e nenhum erro RLS é retornado
