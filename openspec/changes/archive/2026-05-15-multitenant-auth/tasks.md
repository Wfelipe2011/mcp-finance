## 1. Dependências

- [x] 1.1 Adicionar `bcryptjs` e `@types/bcryptjs` ao `package.json` do servidor principal

## 2. Auth Middleware e Login

- [x] 2.1 Atualizar `auth-middleware.ts` — `verifyAuth` extrai `tenant_id` do payload JWT e retorna `{ valid: true, tenantId: string }` ou `{ valid: false }`; rejeitar JWT sem `tenant_id`
- [x] 2.2 Reescrever `routes/auth.ts` — `handleLogin` busca tenant por email na tabela `tenants`, compara senha com bcrypt, rejeita tenant inativo, emite JWT com `{ sub: email, tenant_id, tenant_name }`, atualiza `last_login_at`
- [x] 2.3 Atualizar `server.ts` — extrair `tenantId` do resultado de `verifyAuth` e passar para `router(req, url, tenantId)`

## 3. Router e Handlers

- [x] 3.1 Atualizar `router.ts` — aceitar `tenantId` como terceiro parâmetro e repassar para todos os handlers
- [x] 3.2 Atualizar `routes/sync.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)` e `new TokenHttpAdapter(tenantId)`
- [x] 3.3 Atualizar `routes/cashflow.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.4 Atualizar `routes/gastos.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.5 Atualizar `routes/compromissos.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.6 Atualizar `routes/runway.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.7 Atualizar `routes/patrimonio.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.8 Atualizar `routes/investimentos.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.9 Atualizar `routes/digest.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.10 Atualizar `routes/transacoes.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.11 Atualizar `routes/meses.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.12 Atualizar `routes/tendencias.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`
- [x] 3.13 Atualizar `routes/users.ts` — receber `tenantId`, criar `new BunPgAdapter(tenantId)`

## 4. BunPgAdapter

- [x] 4.1 Atualizar construtor de `BunPgAdapter` para aceitar `tenantId?: string`
- [x] 4.2 Em cada `sql.begin(async (tx) => { ... })`, adicionar `await tx\`SET LOCAL app.tenant_id = ${this.tenantId}\`` como primeira instrução (apenas quando `tenantId` está definido)
- [x] 4.3 Verificar queries `sql\`...\`` diretas (fora de `sql.begin`) que acessam tabelas com RLS — convertê-las para `sql.begin()` ou garantir que não existem para tabelas protegidas

## 5. TokenHttpAdapter

- [x] 5.1 Atualizar `TokenHttpAdapter` para aceitar `tenantId` no construtor
- [x] 5.2 Adicionar query `SELECT pluggy_email, pluggy_password FROM tenants WHERE id = $tenantId` no início de `getToken()`
- [x] 5.3 Mudar chamada de `GET /token` para `POST /token { email: pluggy_email, appPassword: pluggy_password }`
- [x] 5.4 Retornar 401 se `tenantId` não encontrado na tabela `tenants`

## 6. Auth Service

- [x] 6.1 Atualizar `auth/app/src/controllers/token.controller.ts` — trocar `GET /token` por `POST /token` com body `{ email, appPassword }`
- [x] 6.2 Remover leitura de `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do env no controller
- [x] 6.3 Passar `email` e `appPassword` do body para `login-automation.ts` (já aceita esses parâmetros)
- [x] 6.4 Remover `PLUGGY_EMAIL` e `PLUGGY_PASSWORD` do `.env.example` e `docker-compose.yml` do auth service

## 7. Verificação

- [x] 7.1 Testar `POST /api/auth/login` com credenciais válidas — JWT retornado deve conter `tenant_id`
- [x] 7.2 Testar `GET /api/cashflow` com JWT válido — deve retornar apenas dados do tenant correto
- [x] 7.3 Testar `GET /api/cashflow` com JWT de tenant A não retorna dados do tenant B
- [x] 7.4 Testar `POST /api/sync` — deve buscar credenciais Pluggy do banco e chamar auth service via POST
- [x] 7.5 Testar que token Pluggy é cacheado por 24h por email (segunda chamada não faz browser automation)
