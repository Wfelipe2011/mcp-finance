## ADDED Requirements

### Requirement: endpoint GET /token
O serviço auth deve expor `GET /token` que retorna o token de sessão Pluggy usando credenciais do ambiente.

#### Scenario: sessão em cache válida
- **WHEN** `GET /token` é chamado e existe sessão válida (< 1 dia) em `sessions.json`
- **THEN** retorna imediatamente `{ token, saved_at, expires_at }` sem abrir o browser

#### Scenario: sessão expirada ou ausente
- **WHEN** `GET /token` é chamado e não existe sessão válida
- **THEN** executa fluxo Puppeteer + Gmail IMAP com `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do ambiente e retorna `{ token, saved_at, expires_at }` após obter o cookie

#### Scenario: credenciais ausentes no ambiente
- **WHEN** `PLUGGY_EMAIL` ou `PLUGGY_PASSWORD` não estão definidos
- **THEN** retorna HTTP 500 com mensagem de erro explicativa

### Requirement: serviço auth no compose
O `docker-compose.yml` da raiz deve incluir o serviço `auth` buildado de `./auth/app`.

#### Scenario: compose up
- **WHEN** `docker compose up -d` é executado
- **THEN** o container `auth` sobe, recebe `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do `.env` e fica disponível em `http://auth:3000` para o `api-server`

### Requirement: persistência de sessão
A sessão Pluggy deve persistir entre reinicializações do container via bind mount.

#### Scenario: container reiniciado
- **WHEN** o container `auth` é reiniciado
- **THEN** `GET /token` reutiliza a sessão salva em `auth/data/sessions.json` sem novo login
