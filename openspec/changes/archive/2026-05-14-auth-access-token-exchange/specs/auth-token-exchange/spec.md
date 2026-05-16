## ADDED Requirements

### Requirement: Trocar appSession por accessToken JWT via endpoint Pluggy
O sistema SHALL chamar `GET https://meu.pluggy.ai/api/access-token` enviando o `appSession` capturado pelo Puppeteer no header `Cookie: appSession={valor}`, extrair o campo `accessToken` do body JSON e retornar esse JWT como o token de autenticação para `my-api.pluggy.ai`.

#### Scenario: Troca bem-sucedida
- **WHEN** o auth service possui um `appSession` válido e chama `GET /api/access-token`
- **THEN** o sistema retorna o `accessToken` JWT do body da resposta

#### Scenario: Endpoint retorna erro
- **WHEN** `GET /api/access-token` retorna status diferente de 2xx
- **THEN** o sistema lança uma exceção com mensagem descritiva incluindo o status HTTP

#### Scenario: Body não contém accessToken
- **WHEN** o endpoint responde com 200 mas o body não contém o campo `accessToken`
- **THEN** o sistema lança uma exceção indicando resposta inesperada

### Requirement: Persistir appSession renovado retornado pela troca
O sistema SHALL inspecionar o header `set-cookie` da resposta de `GET /api/access-token`. Se o header contiver um novo valor para `appSession`, esse valor SHALL sobrescrever o `appSession` armazenado no cache, mantendo o `expiresAt` original (sem reiniciar o TTL de 24h).

#### Scenario: set-cookie com novo appSession presente
- **WHEN** a resposta de `/api/access-token` contém `set-cookie: appSession={novo_valor}; ...`
- **THEN** o sistema substitui o `appSession` armazenado pelo novo valor sem alterar `expiresAt`

#### Scenario: set-cookie ausente ou sem appSession
- **WHEN** a resposta não contém `set-cookie` com `appSession`
- **THEN** o sistema mantém o `appSession` original no cache sem alteração
