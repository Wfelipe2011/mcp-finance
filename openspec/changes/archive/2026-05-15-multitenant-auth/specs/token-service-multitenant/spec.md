## ADDED Requirements

### Requirement: Auth service aceita POST /token com credenciais no body
O auth service SHALL expor `POST /token` recebendo body `{ email: string, appPassword: string }`. O endpoint SHALL verificar cache de sessão por `email`, retornar token cacheado se válido (< 24h), ou executar browser automation com as credenciais fornecidas.

#### Scenario: POST /token com sessão em cache válida
- **WHEN** `POST /token { email: "silva@gmail.com", appPassword: "xxx" }` é chamado e existe sessão válida para esse email
- **THEN** retorna `{ token, saved_at, expires_at }` sem executar browser automation

#### Scenario: POST /token sem sessão em cache
- **WHEN** `POST /token { email: "silva@gmail.com", appPassword: "xxx" }` é chamado sem sessão válida
- **THEN** executa browser automation com as credenciais fornecidas, salva sessão e retorna `{ token, saved_at, expires_at }`

#### Scenario: Body inválido
- **WHEN** `POST /token` recebe body sem `email` ou `appPassword`
- **THEN** retorna 400 com mensagem de erro

## MODIFIED Requirements

### Requirement: Autenticação do auth service
O auth service SHALL remover a leitura de `PLUGGY_EMAIL` e `PLUGGY_PASSWORD` do env. As credenciais SHALL ser recebidas exclusivamente via body do `POST /token`. O endpoint `GET /token` legado SHALL ser removido.

#### Scenario: GET /token não existe mais
- **WHEN** qualquer cliente chama `GET /token`
- **THEN** retorna 404 ou 405 Method Not Allowed

#### Scenario: Sem env vars de Pluggy
- **WHEN** o auth service inicia sem `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` no env
- **THEN** inicia normalmente sem erro (essas vars não são mais necessárias)
