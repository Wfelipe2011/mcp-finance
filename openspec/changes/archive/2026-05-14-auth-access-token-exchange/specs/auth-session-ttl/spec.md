## ADDED Requirements

### Requirement: Armazenar accessToken junto ao appSession no cache
O sistema SHALL persistir o `accessToken` JWT junto ao `appSession` e ao `expiresAt` no arquivo de cache de sessões. O formato de cada entrada SHALL ser `{ appSession, accessToken, expiresAt }`.

#### Scenario: Sessão salva com accessToken
- **WHEN** o fluxo completo de login (Puppeteer + exchange) conclui com sucesso
- **THEN** o cache armazena `{ appSession, accessToken, expiresAt }` indexado pelo email do usuário

### Requirement: Controlar TTL de 24 horas internamente, sem depender de expiração externa
O sistema SHALL calcular `expiresAt` como `now + 24 horas` no momento em que o login Puppeteer é bem-sucedido e a troca por `accessToken` é concluída. O sistema SHALL ignorar o campo `exp` do JWT e a data de expiração de quaisquer cookies ao decidir se a sessão é válida — usando exclusivamente o `expiresAt` calculado internamente.

#### Scenario: Sessão dentro do TTL de 24h
- **WHEN** o instante atual é anterior ao `expiresAt` armazenado
- **THEN** o sistema considera a sessão válida e retorna o `accessToken` sem novo login

#### Scenario: Sessão expirada após 24h
- **WHEN** o instante atual é igual ou posterior ao `expiresAt` armazenado
- **THEN** o sistema descarta a sessão e executa o fluxo completo: Puppeteer → exchange → novo `accessToken`

#### Scenario: Cache inexistente ou sem entrada para o email
- **WHEN** não existe entrada no cache para o email solicitado
- **THEN** o sistema executa o fluxo completo de login e salva nova entrada no cache
