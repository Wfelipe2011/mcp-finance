## Context

Uso pessoal, 1 usuário, sem cadastro. Credenciais fixas em `.env`. A solução mais simples possível que proteja os dados sem adicionar banco de usuários, sessions table, ou refresh tokens.

## Goals / Non-Goals

**Goals:**
- Login com username/password do `.env`
- JWT assinado com `APP_SECRET`, TTL de `AUTH_TOKEN_TTL_DAYS` dias
- Middleware bloqueando toda a API sem token
- Frontend mostrando tela de login quando sem token, app normal quando autenticado
- Sem dependência de biblioteca de auth pesada (jose ou crypto nativo do Bun)

**Non-Goals:**
- Múltiplos usuários ou roles
- Refresh tokens
- "Lembrar de mim" além do TTL configurado
- Reset de senha (quem perdeu edita o `.env` e reinicia)
- HTTPS (responsabilidade do reverse proxy, fora do escopo)

## Decisions

### JWT com `crypto` nativo do Bun

Bun tem `crypto.subtle` nativo (Web Crypto API). JWT HS256 pode ser implementado sem biblioteca:

```
  header.payload.signature
  
  header:  { alg: "HS256", typ: "JWT" }
  payload: { sub: username, exp: <unix timestamp>, iat: <now> }
  signature: HMAC-SHA256(base64(header) + "." + base64(payload), APP_SECRET)
```

Alternativa: usar a lib `jose` (leve, sem deps). Preferimos `jose` — menos código, mais seguro.

### Comparação de senha com timing-safe

```typescript
import { timingSafeEqual } from "crypto";
// compara Buffer(inputPassword) com Buffer(APP_PASSWORD)
// evita timing attack
```

### Middleware no server.ts

```typescript
// ANTES do router:
if (url.pathname.startsWith("/api/") && url.pathname !== "/api/auth/login") {
  const authResult = verifyJwt(req.headers.get("Authorization"));
  if (!authResult.valid) return new Response("Unauthorized", { status: 401 });
}
```

### Frontend — fluxo de autenticação

```
  App inicializa
       │
       ├── tem authToken em localStorage?
       │         │
       │    NÃO ─┴─ SIM
       │    │         │
       │    ▼         ▼ (token ainda válido?)
       │  <Login>   ──┤
       │    │    NÃO ─┴─ SIM
       │    │    │         │
       │    │    ▼         ▼
       │    │  limpa    <App normal>
       │    │  token
       │    │    │
       │    └────┘
       │   POST /api/auth/login
       │        │
       │    sucesso → salva token → <App>
       │    erro    → mensagem de erro
```

Verificação do token no frontend: decodificar payload (base64) e checar `exp` contra `Date.now()`. Se expirado, remove token e mostra login.

### Tela de login — layout

Centralizada, sem bottom navigation, sem header completo. Só logo, campos e botão. Sem "esqueci a senha".

```
  ┌─────────────────────────────────┐
  │                                 │
  │         💰 Finanças             │
  │                                 │
  │   Usuário                       │
  │   ┌─────────────────────────┐  │
  │   └─────────────────────────┘  │
  │                                 │
  │   Senha                         │
  │   ┌─────────────────────────┐  │
  │   └─────────────────────────┘  │
  │                                 │
  │   ┌─────────────────────────┐  │
  │   │         Entrar          │  │
  │   └─────────────────────────┘  │
  │                                 │
  └─────────────────────────────────┘
```

### Token no `client.ts`

Todas as funções `fetch` em `client/src/api/client.ts` passam a incluir:
```
Authorization: Bearer <localStorage.getItem('authToken')>
```

Quando o servidor retorna 401, limpa o token e recarrega a página (volta para login).

## Risks / Trade-offs

- **APP_SECRET fraco**: se o usuário usar um secret curto/previsível, o JWT é quebrável. Mitigação: comentário no `.env.example` pedindo `openssl rand -base64 48`.
- **localStorage para JWT**: vulnerável a XSS. Aceitável para app pessoal sem input de usuários externos. Alternativa (httpOnly cookie) adicionaria complexidade desnecessária.
- **jose como dep**: adiciona ~15KB ao bundle. Alternativo seria `crypto.subtle` nativo mas é mais verboso.
