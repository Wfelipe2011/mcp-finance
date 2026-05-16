## 1. Cache de Sessão (session-store)

- [x] 1.1 Atualizar o tipo `SessionData` em `session-store.ts` para incluir o campo `accessToken: string`
- [x] 1.2 Atualizar `saveSession(email, appSession, accessToken)` para persistir ambos os valores
- [x] 1.3 Atualizar `getValidSession(email)` para retornar `{ appSession, accessToken }` em vez de apenas `appSession`
- [x] 1.4 Apagar o `sessions.json` existente (formato incompatível com o novo schema)

## 2. Troca de Token (browser.ts)

- [x] 2.1 Adicionar método `exchangeForAccessToken(appSession: string): Promise<{ accessToken: string; newAppSession?: string }>` em `BrowserAutomation`
- [x] 2.2 Implementar a chamada `GET https://meu.pluggy.ai/api/access-token` com `Cookie: appSession={valor}` e headers `User-Agent` e `Referer` adequados
- [x] 2.3 Extrair `accessToken` do body JSON e lançar erro descritivo se ausente ou se status não for 2xx
- [x] 2.4 Extrair novo `appSession` do header `set-cookie` da resposta (se presente) e retornar em `newAppSession`

## 3. Orquestração do Fluxo (login-automation.ts)

- [x] 3.1 Após `browser.navigateToMagicLink()`, chamar `browser.exchangeForAccessToken(appSession)` para obter o JWT
- [x] 3.2 Se `newAppSession` for retornado pela troca, usar o valor renovado ao salvar no cache
- [x] 3.3 Passar `accessToken` para `saveSession(email, appSession, accessToken)` ao persistir
- [x] 3.4 No caminho de cache hit, retornar `result.accessToken` (em vez de `result.appSession`)

## 4. Controller e Resposta do /token (token.controller.ts)

- [x] 4.1 Atualizar `tokenHandler` para usar `result.accessToken` no campo `token` da resposta JSON
- [x] 4.2 Confirmar que o formato de resposta `{ token, saved_at, expires_at }` permanece inalterado (apenas o conteúdo de `token` muda)

## 5. Validação e Testes Manuais

- [x] 5.1 Rebuild da imagem Docker do auth service com `docker compose build auth`
- [x] 5.2 Reiniciar o container com `docker compose up -d --force-recreate auth`
- [x] 5.3 Verificar que `docker exec mcp-finance-auth-1 curl -s http://localhost:3000/token | python3 -m json.tool` retorna um objeto com `token` iniciando em `eyJ` (JWT)
- [x] 5.4 Disparar o sync via `POST /api/sync` e confirmar que não retorna 403
- [x] 5.5 Verificar que o banco recebe dados: `docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "SELECT COUNT(*) FROM transactions;"`
