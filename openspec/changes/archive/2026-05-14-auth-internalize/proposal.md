## Why

O projeto dependia de um serviço externo rodando em `192.168.0.194:4567` para obter o token Pluggy — um servidor de LAN pessoal do Wilson, invisível para qualquer outra pessoa. O repositório `auth/app` (my_pluggy_login) implementa exatamente esse serviço: usa Puppeteer + IMAP para fazer login passwordless no Meu Pluggy e cachear o cookie de sessão.

Internalizando o auth como um serviço no compose, qualquer pessoa que clonar o repo e configurar o `.env` terá o fluxo completo funcionando sem depender de nenhuma infraestrutura externa de LAN.

## What Changes

- O diretório `auth/app` (já clonado) é integrado ao `docker-compose.yml` da raiz como serviço `auth`
- O serviço `auth` recebe `PLUGGY_EMAIL` e `PLUGGY_PASSWORD` do `.env` e os usa para fazer o login automaticamente em `POST /login`
- Um novo endpoint `GET /token` é adicionado ao `auth/app` que chama internamente o fluxo de login com as credenciais do `.env` e retorna `{ token, saved_at, expires_at }` — shape compatível com o `TokenHttpAdapter` atual
- O `api-server` passa a se comunicar com `http://auth:3000/token` via rede interna do compose
- Bind mounts para `auth/data/` e `auth/screenshots/` persistem a sessão entre reinicializações

## Capabilities

### New Capabilities
- `pluggy-auth-service`: Serviço containerizado que automatiza o login no Meu Pluggy via Puppeteer + Gmail IMAP e serve o token via HTTP para uso interno do compose

### Modified Capabilities
- `token-provider`: `GET /token` passa a ser servido pelo container `auth` em vez de um IP de LAN externo

## Impact

- `docker-compose.yml` — adição do serviço `auth` com build de `./auth/app`
- `auth/app/src/` — novo endpoint `GET /token` que usa credenciais do `.env`
- `auth/app/.env` — não é mais necessário (credenciais vêm do `.env` da raiz via compose)
- `TokenHttpAdapter.ts` — sem mudança de lógica; apenas o default de URL muda (coberto por env-centralize)
