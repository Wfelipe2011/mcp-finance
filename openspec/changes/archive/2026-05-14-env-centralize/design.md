## Context

`TokenHttpAdapter.ts` tem `http://192.168.0.194:4567/token` como default hardcoded — funciona na LAN do Wilson mas quebra para qualquer outra pessoa. O `.env.example` atual só cobre postgres e IA. Com a adição do serviço `auth/app` ao compose, o número de variáveis cresce e precisa de documentação centralizada.

## Goals / Non-Goals

**Goals:**
- Um único `.env.example` que seja suficiente para subir tudo via `docker compose up`
- `TokenHttpAdapter` sem nenhum IP hardcoded
- Cada variável comentada explicando o que é e onde obter

**Non-Goals:**
- Validação de schema de `.env` em runtime (Zod/dotenv-safe) — não vale a complexidade para uso pessoal
- Multi-ambiente (dev/staging/prod) — uso pessoal tem só um ambiente

## Decisions

### TOKEN_URL default → nome do container

No compose, o serviço de auth se chama `auth`. A URL interna é `http://auth:3000/token`. O `TokenHttpAdapter` usa `process.env["TOKEN_URL"] ?? "http://auth:3000/token"` como default — funciona out-of-box no compose sem precisar setar no `.env`.

Para dev local (fora do compose), a pessoa seta `TOKEN_URL=http://localhost:3000/token` no `.env`.

### .env.example como fonte da verdade

O arquivo documenta todas as variáveis em grupos lógicos com comentários. O compose lê do `.env` via `env_file` ou `${VAR}` notation. Nenhuma variável de conexão entre containers vai para o `.env` do usuário — são inferidas pelo compose (ex: `DATABASE_URL` interna aponta para `postgres:5432`, não `localhost:5434`).

### Variáveis que ficam fora do .env do usuário

| Variável | Valor fixo no compose | Motivo |
|---|---|---|
| `DATABASE_URL` (interno) | `postgres://finance:finance@postgres:5432/finance` | nome do container |
| `TOKEN_URL` (interno) | `http://auth:3000/token` | nome do container |

O `.env` do usuário só tem: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `PLUGGY_EMAIL`, `PLUGGY_PASSWORD`, `AI_BASE_URL`, `AI_MODEL`, `APP_USERNAME`, `APP_PASSWORD`, `APP_SECRET`.

## Risks / Trade-offs

- **APP_SECRET fraco**: se o usuário copiar `.env.example` sem trocar `APP_SECRET`, o JWT fica inseguro. Mitigação: comentário muito explícito no exemplo + instrução no README.
- **Desenvolvimento local**: sem o serviço `auth` rodando, `bun run sync` vai falhar se `TOKEN_URL` não estiver setado. Documentar no README que em dev local é necessário subir o auth separado ou setar `TOKEN_URL` manualmente.
