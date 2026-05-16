## Why

O sistema de autenticação atual é single-tenant: login compara com `APP_USERNAME`/`APP_PASSWORD` do env e emite JWT sem contexto de tenant. O `BunPgAdapter` não tem `tenantId` — todas as queries acessam todos os dados. O auth service (`auth/app`) lê credenciais Pluggy do env — não suporta múltiplos tenants.

Para habilitar multi-tenancy, o JWT precisa carregar `tenant_id`, o login precisa ser contra a tabela `tenants`, e cada query ao banco precisa injetar `SET LOCAL app.tenant_id` automaticamente via o adapter.

## What Changes

- **BREAKING** `POST /api/auth/login` deixa de comparar env vars e passa a autenticar contra a tabela `tenants` (email + bcrypt)
- **BREAKING** JWT passa a incluir `tenant_id` e `tenant_name` no payload além de `sub`
- `verifyAuth` middleware extrai e retorna `tenantId` do JWT (hoje só retorna `{ valid: true }`)
- `BunPgAdapter` recebe `tenantId` como parâmetro de construção e injeta `SET LOCAL app.tenant_id` em todo `sql.begin()`
- Todas as rotas da API recebem `tenantId` extraído do middleware e passam para o adapter
- `TokenHttpAdapter` busca `pluggy_email`/`pluggy_password` da tabela `tenants` e chama auth service via `POST /token { email, appPassword }` (hoje é `GET /token`)
- **BREAKING** Auth service `GET /token` vira `POST /token` recebendo `{ email, appPassword }` no body
- `UPDATE tenants SET last_login_at = NOW()` ao login bem-sucedido
- Cache de sessão Pluggy por 24h por tenant (o session-store já usa email como chave — funciona sem mudança)

## Capabilities

### New Capabilities

- `tenant-login`: Login contra tabela `tenants` com bcrypt, emissão de JWT com `tenant_id`, atualização de `last_login_at`
- `tenant-scoped-adapter`: `BunPgAdapter` recebendo `tenantId` e injetando `SET LOCAL` em todo `sql.begin()`
- `token-service-multitenant`: Auth service aceita `POST /token { email, appPassword }` para Pluggy por tenant

### Modified Capabilities

- `auth-token-exchange`: O endpoint do auth service muda de `GET /token` para `POST /token { email, appPassword }`

## Impact

- `src/application/web/routes/auth.ts` — lógica de login completamente reescrita
- `src/application/web/auth-middleware.ts` — retorna `tenantId` extraído do JWT
- `src/application/web/router.ts` — propaga `tenantId` para todos os handlers (14 rotas)
- `src/application/web/routes/*.ts` — todos os handlers recebem `tenantId` e passam para o adapter (14 arquivos)
- `src/infrastructure/db/BunPgAdapter.ts` — construtor recebe `tenantId`, todos os `sql.begin()` injetam `SET LOCAL`
- `src/infrastructure/token/TokenHttpAdapter.ts` — busca credenciais do DB, chama `POST /token`
- `auth/app/src/controllers/token.controller.ts` — muda de `GET` para `POST`, recebe `{ email, appPassword }` do body
- `jose` (já usado para JWT) — sem nova dependência
- `bcryptjs` ou `@node-rs/bcrypt` — nova dependência para hash de senha
