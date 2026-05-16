## Context

O banco de dados PostgreSQL 16 do projeto está rodando via Docker na porta 5434 (`mcp-finance-postgres-1`). O GitHub Copilot Agent no VS Code suporta MCP via stdio transport: o editor spawna o processo MCP localmente, passa JSON no stdin/stdout, e o agente acessa as tools disponíveis durante a sessão de codificação.

O objetivo desta fase é exploratório: permitir que o agente consulte dados, descubra padrões e anote conhecimento de domínio que alimentará o servidor MCP customizado a ser construído posteriormente.

## Goals / Non-Goals

**Goals:**
- Instalar `postgres-mcp` globalmente via `pip` (Python 3.12+)
- Configurar `.vscode/mcp.json` para o Copilot Agent conectar ao banco financeiro em modo read-only
- Criar `docs/finance-context.md` como arquivo de contexto semântico persistente e versionado
- O arquivo de contexto deve ter estrutura clara para anotações incrementais do agente

**Non-Goals:**
- Servidor MCP customizado (fase futura)
- SSE/HTTP transport (stdio suficiente para VS Code)
- Acesso write (restricted mode é obrigatório)
- Múltiplos clientes simultâneos

## Decisions

**D1 — Instalação via `pip install postgres-mcp` (global)**

Sem `uv` nem `uvx` disponíveis no sistema. `pipx` isolaria melhor, mas exige instalação adicional. `pip` global é o caminho de menor fricção. O comando resultante é simplesmente `postgres-mcp` no PATH — o que o VS Code MCP config espera.

**D2 — Modo `restricted` (read-only)**

Dados financeiros pessoais. O Copilot Agent opera com supervisão humana mas pode gerar SQL incorreto. `restricted` previne `DELETE`, `UPDATE`, `DROP` acidentais. Ainda permite SELECT completo, CTEs, window functions, aggregations — tudo que análise exploratória exige.

**D3 — `DATABASE_URI` via variável de ambiente no `.vscode/mcp.json`**

O `.vscode/mcp.json` suporta campo `"env"` para injetar variáveis de ambiente no processo MCP. Vantagem: a URI com senha não fica hardcoded no arquivo se ele for versionado. Desvantagem: o arquivo `.vscode/mcp.json` ainda contém a senha em texto plano no campo `env`. Decisão: adicionar `.vscode/mcp.json` ao `.gitignore` para não versionar.

**D4 — `docs/finance-context.md` como memória semântica versionada**

O arquivo serve dois propósitos:
1. **Contexto inicial** para o agente: domínio, schema, significado de campos, categorias usadas pela Pluggy, padrões de dados
2. **Memória acumulada**: o agente (ou o usuário) anota descobertas durante sessões de exploração — padrões encontrados, queries úteis, anomalias observadas

Esse arquivo é **versionado no git** — diferente do `.vscode/mcp.json`. Ele é conhecimento, não configuração. A estrutura deve ter seções fixas (Schema, Domínio, Categorias) e uma seção aberta de Descobertas onde anotações são acumuladas com data.

**D5 — Contexto injetado manualmente, não via MCP**

O `postgres-mcp` não lê `docs/finance-context.md` automaticamente. O agente precisa que esse arquivo seja incluído no contexto da conversa (via `#file:docs/finance-context.md` ou via `.github/copilot-instructions.md`). A instrução de como usar o arquivo fica no próprio arquivo e no README.

## Risks / Trade-offs

- **Senha em `.vscode/mcp.json`**: mitigado adicionando ao `.gitignore`. Risco residual: `.gitignore` pode ser bypassado.
- **`pip` global pode conflitar com outros pacotes Python**: `postgres-mcp` usa `psycopg3` e `pglast`. Mitigação: se houver conflito, trocar para `pipx` ou `venv`.
- **Contexto semântico fica desatualizado**: se o schema mudar (nova coluna, nova tabela), o `finance-context.md` precisa atualização manual. Mitigação: a seção de Schema no arquivo deve ser mantida sincronizada com `schema.sql`.
- **restricted mode pode bloquear queries legítimas**: funções como `EXPLAIN` com `ANALYZE` exigem modo unrestricted. Para análise pura, restricted é suficiente.
