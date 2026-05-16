## Why

O auth service captura o cookie `appSession` do Auth0 via Puppeteer e o repassa diretamente como Bearer token para `my-api.pluggy.ai` — mas `my-api.pluggy.ai` não aceita `appSession` como Bearer. O token correto é um JWT obtido trocando o `appSession` por um `accessToken` via `GET https://meu.pluggy.ai/api/access-token`. O resultado é HTTP 403 em todas as chamadas ao Pluggy, tornando o sync completamente não funcional.

## What Changes

- **BREAKING**: O auth service passa a retornar um JWT `accessToken` no campo `token` (em vez do cookie `appSession`)
- O auth service adiciona uma etapa de troca: após capturar `appSession` via Puppeteer, chama `GET meu.pluggy.ai/api/access-token` (enviando o cookie) e extrai o `accessToken` JWT
- O `appSession` renovado retornado no `set-cookie` da troca é persistido, substituindo o anterior no cache
- O cache passa a ter TTL de 24 horas **gerenciado por nós** — não confiamos no `exp` do JWT nem na expiração do cookie Auth0
- Ao expirar o cache de 24h, o fluxo completo é reexecutado: Puppeteer → novo `appSession` → troca → novo `accessToken`
- O `PluggyHttpAdapter` não muda — continua recebendo um Bearer token e enviando como `Authorization: Bearer`

## Capabilities

### New Capabilities

- `auth-token-exchange`: Troca `appSession` (cookie Auth0) por `accessToken` JWT via endpoint `GET meu.pluggy.ai/api/access-token`, com renovação automática do `appSession` via `set-cookie`
- `auth-session-ttl`: Controle de validade de 24 horas da sessão gerenciado internamente, independente de expiração do JWT ou do cookie Auth0

### Modified Capabilities

- `token-provider`: O campo `token` retornado pelo endpoint `/token` do auth service passa a conter um JWT `accessToken` válido para `my-api.pluggy.ai`, em vez do cookie `appSession`

## Impact

- **`auth/app/src/integrations/browser.ts`**: adiciona método `exchangeForAccessToken()` que chama `/api/access-token` com o cookie e retorna o JWT + novo appSession
- **`auth/app/src/integrations/session-store.ts`**: campos do cache mudam de `{ appSession, expiresAt }` para `{ appSession, accessToken, expiresAt }` — TTL de 24h controlado por nós
- **`auth/app/src/services/login-automation.ts`**: orquestra a nova etapa de troca após o login Puppeteer
- **`auth/app/src/controllers/token.controller.ts`**: resposta do `/token` passa a usar `accessToken` (JWT) no campo `token`
- **`src/infrastructure/token/TokenHttpAdapter.ts`**: sem mudança de interface, mas agora recebe um JWT real
- **Pluggy API**: requests passarão a ter sucesso (200) em vez de 403
