## Context

O README é o primeiro ponto de contato de qualquer pessoa que encontrar o projeto. Precisa comunicar em 30 segundos o que é o projeto e se vale a pena continuar lendo.

## Goals / Non-Goals

**Goals:**
- Explicar o que é o projeto em 2 linhas
- Setup em 3 comandos visíveis logo no topo
- Pré-requisitos claros e verificáveis
- Documentação de cada variável do `.env`
- Seção de arquitetura com diagrama ASCII simples

**Non-Goals:**
- Documentação de desenvolvimento (contribuição, testes, CI)
- Documentação da API (endpoints, schemas)
- Documentação interna de código

## Decisions

### Estrutura do README

```
  # mcp-finance
  > tagline em 1 linha

  ## Demo / Screenshot (opcional)

  ## Pré-requisitos
  - Docker + Docker Compose
  - Conta Pluggy com bancos conectados
  - Gmail com IMAP + App Password

  ## Setup rápido
  git clone ...
  cp .env.example .env
  # editar .env
  docker compose up -d
  # acessar localhost:3001

  ## Configuração (.env)
  tabela com cada variável, descrição, onde obter

  ## Arquitetura
  diagrama ASCII dos containers

  ## Como usar
  1. Login com credenciais do .env
  2. Clicar 🔄 para sincronizar
  3. Navegar pelas abas

  ## Obtendo App Password do Gmail
  passo a passo com link
```

### Diagrama de arquitetura

```
  ┌─────────────────────────────────────────────┐
  │                docker compose               │
  │                                             │
  │  ┌──────────┐   ┌──────────┐  ┌─────────┐ │
  │  │ postgres  │   │   auth   │  │   api   │ │
  │  │  :5432   │◀──│  :3000   │◀─│  :3001  │ │
  │  └──────────┘   │ Puppeteer│  │  Bun    │ │
  │                 │  + IMAP  │  │  server │ │
  │                 └──────────┘  └────┬────┘ │
  │                                    │      │
  └────────────────────────────────────┼──────┘
                                       │
                              browser :3001
```

### Seção de .env — formato tabela

| Variável | Descrição | Onde obter |
|---|---|---|
| `PLUGGY_EMAIL` | Email Gmail da conta Pluggy | Sua conta Gmail |
| `PLUGGY_PASSWORD` | App Password do Google | myaccount.google.com/apppasswords |
| `APP_USERNAME` | Login do painel | Defina você |
| `APP_PASSWORD` | Senha do painel | Defina você |
| `APP_SECRET` | Chave JWT | `openssl rand -base64 48` |
| `AI_BASE_URL` | URL da API de IA | OpenAI ou local |
| `AI_MODEL` | Modelo de IA | `gpt-4o`, `gemma-4`, etc |

## Risks / Trade-offs

- README fica desatualizado com mudanças de código. Mitigação: manter simples, sem detalhes que mudam frequentemente (sem listar endpoints, sem versões específicas).
