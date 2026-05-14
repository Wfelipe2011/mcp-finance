# mcp-finance

> Painel financeiro pessoal integrado com Open Finance via Pluggy — sincroniza contas bancárias automaticamente e exibe cashflow, gastos, investimentos e patrimônio em uma interface mobile-first.

## Pré-requisitos

- **Docker + Docker Compose** v2+
- **Conta Pluggy** com seus bancos conectados em [dashboard.pluggy.ai](https://dashboard.pluggy.ai)
- **Gmail** com IMAP habilitado e um **App Password** gerado (o Pluggy envia o magic link de login por e-mail)

## Setup rápido

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/mcp-finance.git
cd mcp-finance

# 2. Configure o ambiente
cp .env.example .env
# Edite .env com suas credenciais (ver seção abaixo)

# 3. Suba todos os serviços
docker compose up -d

# 4. Acesse o painel
# http://localhost:3001
```

No primeiro acesso, faça login com `APP_USERNAME` / `APP_PASSWORD` definidos no `.env`, depois clique em **🔄** para sincronizar os dados do Pluggy.

## Configuração (.env)

| Variável | Descrição | Onde obter |
|---|---|---|
| `POSTGRES_USER` | Usuário do banco | Defina (ex: `finance`) |
| `POSTGRES_PASSWORD` | Senha do banco | Defina |
| `POSTGRES_DB` | Nome do banco | Defina (ex: `finance`) |
| `DATABASE_URL` | URL para scripts fora do Docker | Gerada a partir dos valores acima |
| `PLUGGY_EMAIL` | E-mail Gmail da conta Pluggy | Sua conta Gmail |
| `PLUGGY_PASSWORD` | App Password do Google | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| `AI_BASE_URL` | URL base da API de IA (OpenAI-compatible) | LM Studio / Ollama / OpenAI |
| `AI_MODEL` | Nome do modelo de IA | Ex: `gemma-4`, `gpt-4o` |
| `APP_USERNAME` | Usuário para login no painel | Defina você |
| `APP_PASSWORD` | Senha para login no painel | Defina você |
| `APP_SECRET` | Segredo para assinar JWTs | Gere: `openssl rand -base64 32` |
| `TOKEN_URL` | URL do serviço de token (dev local) | Defina se usar fora do Docker |

> **Importante:** `APP_SECRET` deve ser uma string aleatória longa. Nunca use o valor de exemplo em produção.

## Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    docker compose                    │
│                                                      │
│  ┌──────────┐   ┌────────────────┐  ┌────────────┐  │
│  │ postgres │   │      auth      │  │ api-server │  │
│  │  :5432   │◀──│    :3000       │◀─│   :3001    │  │
│  └──────────┘   │ Puppeteer+IMAP │  │ Bun server │  │
│                 │ (login Pluggy) │  │ + React SPA│  │
│                 └────────────────┘  └─────┬──────┘  │
│                                           │         │
└───────────────────────────────────────────┼─────────┘
                                            │
                                   browser :3001
```

**Fluxo de sincronização:**
1. Browser clica em 🔄 → `POST /api/sync`
2. `api-server` chama `GET http://auth:3000/token`
3. `auth` verifica sessão Pluggy em cache (ou faz novo login via Puppeteer + magic link Gmail)
4. `api-server` usa o token para buscar transações na API do Pluggy
5. Dados são gravados no PostgreSQL e views silver/gold são atualizadas

## Como usar

1. **Login** — acesse `http://localhost:3001` e faça login com `APP_USERNAME` / `APP_PASSWORD`
2. **Sincronizar** — clique em **🔄** no cabeçalho para importar transações do Pluggy (aguarde ~30-60s no primeiro login do dia)
3. **Navegar** — use as abas na barra inferior:
   - **Resumo** — cashflow mensal, saldo por banco, compromissos
   - **Gastos** — breakdown por categoria e grupo
   - **Próx. Mês** — projeção de cashflow
   - **Investimentos** — evolução da carteira
   - **Insights** — análise gerada por IA
4. **Configurar membros** — clique em **⚙️** para personalizar os nomes exibidos

## Obtendo App Password do Gmail

O serviço `auth` usa IMAP para ler o magic link que o Pluggy envia por e-mail. Para isso você precisa de um **App Password** (não a senha normal da conta):

1. Acesse [myaccount.google.com](https://myaccount.google.com) com a conta Gmail do Pluggy
2. Vá em **Segurança** → **Verificação em duas etapas** (deve estar ativa)
3. Clique em **Senhas de app** (no final da página de verificação em duas etapas)
4. Em "Selecionar app", escolha **Outro (nome personalizado)** → escreva `mcp-finance`
5. Clique em **Gerar** — copie a senha de 16 caracteres
6. Cole essa senha em `PLUGGY_PASSWORD` no seu `.env`

> A senha de app tem 16 caracteres sem espaços. O Google a exibe apenas uma vez.

## Análise com GitHub Copilot (MCP)

O projeto inclui configuração para o `postgres-mcp`, que permite ao GitHub Copilot Agent consultar o banco de dados financeiro diretamente via chat.

**Instalação:**
```bash
pip install --user --break-system-packages postgres-mcp
```

Configure `DATABASE_URL` no `.vscode/mcp.json` apontando para `localhost:5434` (a porta exposta pelo container postgres).

   ```bash
   docker compose up -d
   bun run sync   # sincronizar dados da Pluggy
   ```

3. **Configurar VS Code**: copiar o template e ajustar as credenciais:
   ```bash
   cp .vscode/mcp.json.example .vscode/mcp.json  # se disponível
   ```
   Ou criar `.vscode/mcp.json` manualmente (ver `design.md` do change `postgres-mcp-setup`).

### Usando o agente

No GitHub Copilot Chat em **Agent Mode**, o servidor `postgres-finance` estará disponível. Inclua o arquivo de contexto nos seus prompts para melhores resultados:

```
#file:docs/finance-context.md

Quais foram meus maiores gastos no último mês?
```

O arquivo `docs/finance-context.md` contém:
- Schema completo das 6 tabelas
- Enumerações e valores possíveis
- Queries de referência prontas
- Seção **Descobertas** para anotar padrões encontrados durante as sessões

> O agente opera em modo `restricted` (somente leitura) — não é possível alterar dados acidentalmente.
