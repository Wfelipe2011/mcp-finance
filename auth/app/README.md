# my-pluggy-login

API REST em Express + TypeScript que automatiza o login no [Meu Pluggy](https://meu.pluggy.ai) via Puppeteer (browser headless) e lê o magic link enviado por e-mail usando IMAP com senha de aplicativo do Gmail.

## Como funciona

```
POST /login  { email, appPassword }
        │
        ▼
  Verifica cache (sessions.json)
  ├── Sessão válida → retorna appSession direto
  └── Expirada ou ausente → executa automação:
        1. Abre https://meu.pluggy.ai/
        2. Clica em "Entrar"
        3. Preenche e-mail e submete
        4. Aguarda e-mail do Pluggy via IMAP
        5. Extrai o magic link do corpo do e-mail
        6. Abre o link em nova aba do browser
        7. Extrai o cookie "appSession"
        8. Salva sessão por 1 dia no cache
        └── Retorna appSession
```

## Pré-requisitos

- Node.js 20+ (ou Docker)
- Conta Gmail com IMAP habilitado e App Password gerada

## Configuração do Gmail

### 1. Habilitar IMAP

1. Abra o Gmail → **Configurações** (engrenagem) → **Ver todos os apps**
2. Aba **Encaminhamento e POP/IMAP** → **Acesso IMAP** → **Ativar IMAP**
3. Salve

### 2. Gerar senha de aplicativo (App Password)

> Requer verificação em duas etapas ativa na conta Google.

1. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crie uma senha para o app `pluggy-login`
3. Copie a senha de 16 caracteres — ela será enviada no body da requisição

## Instalação e execução

### Desenvolvimento local

```bash
npm install
cp .env.example .env
# Edite o .env com as configurações do ambiente
npm run dev
```

### Produção (Node.js)

```bash
npm run build
npm start
```

### Docker

```bash
# Build e subir
docker compose up --build -d

# Logs
docker compose logs -f api

# Parar
docker compose down
```

> Os arquivos `data/sessions.json` e `screenshots/` são montados como bind mounts na raiz do projeto e persistem entre reinicializações.

## Endpoints

### `POST /login`

Inicia o fluxo de automação. Se houver sessão válida em cache, retorna sem abrir o browser.

**Body:**
```json
{
  "email": "seu@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx"
}
```

**Resposta de sucesso (`200`):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "appSession": "eyJhb..."
}
```

**Sessão em cache (`200`):**
```json
{
  "success": true,
  "message": "Sessão reutilizada do cache",
  "appSession": "eyJhb..."
}
```

**Erro de validação (`400`):**
```json
{ "success": false, "error": "email e appPassword são obrigatórios" }
```

**Erro de automação (`500`):**
```json
{ "success": false, "error": "Falha na automação de login" }
```

---

### `GET /health`

```json
{ "status": "ok" }
```

## Screenshots de erro

Em caso de falha ao localizar um elemento na página, um print da tela é salvo automaticamente em `screenshots/` com o nome `error-<contexto>-<timestamp>.png`. Útil para diagnosticar mudanças no layout do site.

Para ver o browser ao vivo durante a automação, defina `PUPPETEER_HEADLESS=false` no `.env`.

## Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `PORT` | não | `3000` | Porta do servidor |
| `PLUGGY_URL` | não | `https://meu.pluggy.ai/` | Landing page do Pluggy |
| `PLUGGY_SELECTOR_LOGIN_LINK` | não | `a[href="/login"]` | Seletor da âncora de login |
| `PLUGGY_SELECTOR_EMAIL` | não | `input[type="email"]` | Seletor do campo de e-mail |
| `PLUGGY_SELECTOR_SUBMIT_EMAIL` | não | `button[type="submit"]` | Seletor do botão de envio |
| `PLUGGY_SUCCESS_URL_PATTERN` | não | `meu.pluggy.ai` | Substring da URL de sucesso |
| `GMAIL_LINK_SENDER` | sim | — | Remetente do e-mail com magic link |
| `GMAIL_MAGIC_LINK_URL_PATTERN` | não | `auth0.com` | Padrão de URL do magic link no e-mail |
| `GMAIL_POLL_INTERVAL_MS` | não | `3000` | Intervalo de polling do Gmail (ms) |
| `GMAIL_POLL_TIMEOUT_MS` | não | `30000` | Timeout máximo para aguardar o e-mail (ms) |
| `PUPPETEER_HEADLESS` | não | `true` | `false` abre o browser visível (debug) |
| `SCREENSHOTS_DIR` | não | `./screenshots` | Pasta para screenshots de erro |
| `SESSIONS_FILE` | não | `./sessions.json` | Caminho do arquivo de cache de sessões |
