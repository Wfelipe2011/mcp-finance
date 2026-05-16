## Context

O sistema usa `jose` para JWT e `bun SQL` tagged templates para o banco. O `BunPgAdapter` é instanciado como `new BunPgAdapter()` em cada handler de rota — sem estado entre requests. O `verifyAuth` middleware hoje retorna apenas `{ valid: true | false }`.

O auth service é uma aplicação Express separada (`auth/app/`) com seu próprio processo. Hoje ele lê `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do env. O session store (`auth/data/sessions.json`) já usa email como chave — multi-tenant por design acidental.

## Goals / Non-Goals

**Goals:**
- JWT carrega `tenant_id` — toda requisição autenticada tem contexto de tenant
- `BunPgAdapter(tenantId)` injeta `SET LOCAL app.tenant_id` em todo `sql.begin()`
- Login contra tabela `tenants` com bcrypt
- Auth service vira stateless em relação a credenciais — recebe no body, não lê do env
- Cache Pluggy de 24h por email continua funcionando sem mudança

**Non-Goals:**
- Super admin (change separado)
- Gerenciamento de tenants via API (create/update/delete tenants — change separado)
- Renovação de JWT / refresh tokens — TTL configurável via `AUTH_TOKEN_TTL_DAYS` (já existe)

## Decisions

### D1: tenantId no construtor do BunPgAdapter

**Escolhido**: `new BunPgAdapter(tenantId)` — o adapter é stateful com `tenantId` definido na construção, e injeta `SET LOCAL app.tenant_id = ${this.tenantId}` como primeira instrução em cada `sql.begin()`.

**Alternativas consideradas**:
- `adapter.withTenant(tenantId)` retornando uma view do adapter → mais elegante mas exige refactor maior da interface
- `tenantId` como parâmetro de cada método → muito verboso, 7+ métodos × N chamadas

**Rationale**: O adapter já é instanciado por request (`new BunPgAdapter()` em cada handler). Adicionar `tenantId` ao construtor é a menor mudança possível e mantém o padrão existente.

### D2: verifyAuth retorna tenantId

**Escolhido**: `verifyAuth` retorna `{ valid: true, tenantId: string }` quando o JWT é válido.

```typescript
// ANTES
return { valid: true };

// DEPOIS
const { payload } = await jwtVerify(token, secret);
return { valid: true, tenantId: payload.tenant_id as string };
```

**Rationale**: O middleware já faz o `jwtVerify` — extrair `tenant_id` do payload é custo zero. Passar `tenantId` como retorno evita um segundo `jwtVerify` nos handlers.

### D3: router.ts propaga tenantId para todos os handlers

**Escolhido**: `router(req, url, tenantId)` — o router recebe e repassa para cada handler.

**Rationale**: Centraliza o fluxo de `tenantId`. Todos os 14 handlers recebem `tenantId` como terceiro parâmetro — mudança mecânica mas necessária.

### D4: TokenHttpAdapter busca credenciais do DB antes de chamar o auth service

```
ANTES: GET http://auth:3000/token  (sem parâmetros)

DEPOIS:
  1. SELECT pluggy_email, pluggy_password FROM tenants WHERE id = $tenantId
  2. POST http://auth:3000/token { email, appPassword }
```

**Rationale**: O servidor principal tem acesso ao banco — é o local correto para buscar credenciais por tenant. O auth service fica stateless — não precisa de banco, não precisa de env vars de Pluggy.

### D5: Auth service POST /token recebe credenciais no body

**Escolhido**: `POST /token` com body `{ email: string, appPassword: string }`.

**Rationale**: O `login-automation.ts` já aceita `{ email, appPassword }` — só o controller precisa mudar. A session store continua usando `email` como chave de cache — sem mudança.

## Risks / Trade-offs

- **Blast radius de 14 handlers** → mudança mecânica mas propensa a erros de digitação. Mitigation: TypeScript vai capturar tipos incompatíveis; testar cada rota após a mudança.
- **`BunPgAdapter` sem `tenantId` vaza dados** → se qualquer handler esquecer de passar `tenantId`, o adapter opera sem `SET LOCAL` e o RLS bloqueia todas as linhas. Resultado: lista vazia, não vazamento. Mitigation: aceitável no MVP.
- **bcrypt dependência nova** → Bun tem `bcryptjs` disponível. Alternativa: `@node-rs/bcrypt` com bindings nativos mais rápidos. Para MVP, `bcryptjs` puro JS é suficiente.
- **Credenciais Pluggy trafegam em HTTP interno** → rede Docker bridge é confiável no MVP. Sem TLS interno.

## Migration Plan

1. Adicionar `bcryptjs` (ou equivalente) como dependência
2. Atualizar `auth-middleware.ts` para extrair `tenant_id` do JWT
3. Reescrever `routes/auth.ts` para autenticar contra `tenants` table
4. Atualizar `BunPgAdapter` construtor + todos os `sql.begin()` blocks
5. Atualizar `router.ts` para passar `tenantId`
6. Atualizar todos os 14 handlers em `routes/`
7. Atualizar `TokenHttpAdapter` para buscar credenciais e chamar `POST /token`
8. Atualizar auth service controller de `GET` para `POST`
9. Criar tenant inicial via script de migração (ou manualmente via INSERT)

## Open Questions

- *(Resolvido)* Estratégia de propagação: construtor do adapter ✓
- *(Resolvido)* Auth service stateless, recebe credenciais no body ✓
- Bcrypt rounds para `password_hash`? → 10 rounds é padrão seguro e rápido o suficiente para MVP
