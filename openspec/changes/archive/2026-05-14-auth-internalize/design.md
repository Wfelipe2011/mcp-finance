## Context

O `auth/app` (my_pluggy_login) expõe `POST /login { email, appPassword }` e retorna `{ appSession }`. Esse contrato foi desenhado para uso interativo — alguém chama com as credenciais no body. Precisamos de dois ajustes para o caso de uso do compose:

1. Um endpoint `GET /token` que lê `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do ambiente e retorna o shape que o `TokenHttpAdapter` já espera
2. As credenciais fixadas no `.env` da raiz, repassadas ao container via compose

O `POST /login` original pode ser mantido para debug/uso manual.

## Goals / Non-Goals

**Goals:**
- `GET /token` retornando `{ token, saved_at, expires_at }` compatível com `TokenHttpAdapter`
- Serviço `auth` no compose recebendo credenciais via env, sem hardcode
- Sessão persistida em bind mount para sobreviver a reinicializações do container
- `api-server` conseguindo chamar `http://auth:3000/token` pela rede interna do compose

**Non-Goals:**
- Renovação automática de token antes de expirar (o `TokenHttpAdapter` já trata expiração com warning)
- Suporte a múltiplas contas Pluggy
- Interface de status do auth no frontend (sync já cobre isso indiretamente)

## Decisions

### GET /token — adaptador sobre POST /login

```
  GET /token
       │
       ▼
  LoginAutomationService.execute({
    email: process.env.PLUGGY_EMAIL,
    appPassword: process.env.PLUGGY_PASSWORD
  })
       │
       ▼  (retorna { appSession, ... })
  {
    token: appSession,
    saved_at: new Date().toISOString(),
    expires_at: <now + 1 dia>
  }
```

Reutiliza toda a lógica existente de cache (sessions.json) — se a sessão já está válida, retorna imediatamente sem rodar o Puppeteer.

### Estrutura do compose

```yaml
auth:
  build: ./auth/app
  environment:
    PLUGGY_EMAIL: ${PLUGGY_EMAIL}
    PLUGGY_PASSWORD: ${PLUGGY_PASSWORD}
    GMAIL_LINK_SENDER: no-reply@pluggy.ai
    PORT: "3000"
  volumes:
    - ./auth/data:/app/data          # sessions.json persiste
    - ./auth/screenshots:/app/screenshots
  restart: unless-stopped
  # sem exposição de porta — apenas rede interna
```

O `api-server` depende do `auth` com `condition: service_started` (não `service_healthy` — o auth não tem healthcheck implementado ainda).

### Porta do auth

O container roda na porta 3000 internamente. Não é exposto ao host por padrão (para não vazar o token para a rede local). Para debug, o usuário pode adicionar manualmente `ports: ["3000:3000"]`.

### Bind mounts na raiz

`auth/data/` e `auth/screenshots/` ficam na raiz do projeto (em `.gitignore`) para fácil inspeção sem entrar no container.

## Risks / Trade-offs

- **Puppeteer no Docker**: a imagem `ghcr.io/puppeteer/puppeteer:24` é ~1GB e requer Chrome. Primeira build é lenta. Em ARM (M1/Raspberry Pi), pode precisar de `--no-sandbox` no Puppeteer.
- **Gmail IMAP timing**: o magic link pode demorar. `GMAIL_POLL_TIMEOUT_MS=30000` (30s) é o default. Se o Gmail estiver lento, o login falha e o sync também.
- **Sessão de 1 dia**: após ~24h, o próximo sync dispara novo login (Puppeteer + magic link). Isso é invisível ao usuário mas adiciona ~30s ao primeiro sync do dia.
- **PLUGGY_PASSWORD é App Password do Google**: precisa de 2FA ativo na conta Gmail. Documentar claramente no README.
