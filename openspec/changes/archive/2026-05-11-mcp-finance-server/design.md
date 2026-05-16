## Context

O projeto `mcp-finance` já possui:
- 11 views SQLite cobrindo patrimônio, cashflow, orçamento, alertas e categorias
- `BunSQLiteAdapter` que abre o banco em modo write e gerencia todos os repositórios
- `SyncUseCase` que orquestra a coleta de dados via Pluggy API
- `src/scripts/sync.ts` como entrypoint do sync

O objetivo é criar um servidor MCP Streamable HTTP que expõe esses dados e o sync como interface padronizada para agentes/LLMs. O runtime é Bun. O SDK usado é `@modelcontextprotocol/sdk` v1.x com peer dep `zod`.

## Goals / Non-Goals

**Goals:**
- Expor as 11 views como Resources MCP com URI scheme `finance://views/<slug>` e payload `application/json`
- Expor o sync como Tool MCP com output JSON de resumo
- Servidor Streamable HTTP sem autenticação (uso local)
- Conexão readonly ao banco para resources/tools de leitura
- Entrypoint `src/scripts/mcp.ts` + script `"mcp"` no `package.json`

**Non-Goals:**
- Autenticação ou autorização
- Stdio transport (Streamable HTTP é o alvo)
- Tools de query customizada (filtros, janelas dinâmicas) — apenas views fixas
- Modificação do `BunSQLiteAdapter` ou `SyncUseCase`
- Frontend ou UI

## Decisions

**D1 — Primitivas: Resources para views, Tool para sync**

Views são snapshots read-only sem parâmetros — mapeiam naturalmente para Resources MCP. O sync tem side effects e parâmetros implícitos (credenciais de env) — mapeia para Tool. Alternativa (tudo como Tools) descartada: Resources têm semântica de "dado disponível", Tools têm semântica de "ação com efeito" — usar o tipo certo ajuda o LLM a raciocinar melhor.

**D2 — 11 Resources individuais, não ResourceTemplate**

Cada view tem sua própria `description` que contextualiza o dado para o LLM. Com `ResourceTemplate` genérico, a descrição seria compartilhada e menos informativa. Alternativa (template `finance://views/{name}`) descartada: perda de contexto por view.

**D3 — `FinanceQueryDb` separado do `BunSQLiteAdapter`**

O MCP server precisa de uma conexão `readonly: true` permanente durante sua vida. `BunSQLiteAdapter` abre em write mode e gerencia repositórios de escrita — misturar os dois criaria ambiguidade. `FinanceQueryDb` é uma classe mínima: abre `Database(path, { readonly: true })`, expõe um método `queryView(sql: string): unknown[]`. Sem ports, sem repositórios. Alternativa (passar `readonly` flag para `BunSQLiteAdapter`) descartada: o adapter faz `PRAGMA foreign_keys = ON` e `initSchema()` — não adequado para leitura.

**D4 — Sync Tool cria `BunSQLiteAdapter` temporariamente**

O tool `sync` instancia `BunSQLiteAdapter` + `TokenHttpAdapter` internamente, executa `SyncUseCase.run()`, fecha. A conexão write existe apenas durante a execução do tool. SQLite WAL permite isso em paralelo com a conexão readonly do servidor. Alternativa (uma conexão compartilhada) descartada: mistura de modes.

**D5 — Payload dos Resources: JSON array serializado como `text`**

Resources MCP retornam `contents[].text`. O conteúdo é `JSON.stringify(rows)` onde `rows` é o resultado da query. `mimeType: "application/json"`. O LLM recebe JSON limpo. Sem envelope de metadados (`generatedAt`, etc.) — o LLM não precisa da "idade" do dado para tasks típicas.

**D6 — Porta via env `MCP_PORT`, padrão 3000**

Configurável sem alterar código. O servidor usa `node:http` para compatibilidade com o transport do SDK.

**D7 — Estrutura de arquivos**

```
src/
  application/mcp/
    FinanceMcpServer.ts    ← instancia McpServer, registra resources + tool
  infrastructure/db/
    FinanceQueryDb.ts      ← Database readonly, queryView()
  scripts/
    mcp.ts                 ← entrypoint: instancia deps, conecta transport, listen()
```

**D8 — Slugs dos URIs**

| View SQL              | URI                                     |
|-----------------------|-----------------------------------------|
| v_overview            | finance://views/overview                |
| v_bank_summary        | finance://views/bank-summary            |
| v_credit_summary      | finance://views/credit-summary          |
| v_investment_summary  | finance://views/investment-summary      |
| v_net_worth           | finance://views/net-worth               |
| v_monthly_cashflow    | finance://views/monthly-cashflow        |
| v_spending_by_cat     | finance://views/spending-by-cat         |
| v_investment_maturity | finance://views/investment-maturity     |
| v_credit_alerts       | finance://views/credit-alerts           |
| v_top_categories_30d  | finance://views/top-categories-30d      |
| v_budget_5030_20      | finance://views/budget-5030-20          |

## Risks / Trade-offs

- **[Risco] SQLite WAL + dois processos** → Se `bun run sync` (processo separado) rodar enquanto o MCP server está ativo, dois processos escrevem no banco. WAL suporta isso, mas há risco de contenção. Mitigação: documentar que o sync via Tool MCP é o caminho preferencial quando o servidor está ativo.
- **[Risco] `initSchema()` no `BunSQLiteAdapter` dropa e recria views** → O script de apply_schema criado durante o desenvolvimento recroia views. O `BunSQLiteAdapter` usa `CREATE VIEW IF NOT EXISTS` — sem problema. Mas se alguém rodar `bun run sync` pela primeira vez sem ter aplicado as views manualmente, as views estarão lá (o sync chama `initSchema`). Sem problema real.
- **[Trade-off] Sem autenticação** → Acesso irrestrito local. Adequado para desenvolvimento. Se exposto em rede, qualquer cliente MCP pode invocar o sync (que consome API Pluggy com credenciais de env). Mitigação: bind em `127.0.0.1` por padrão.
- **[Trade-off] Resources são snapshot do momento da query** → Não há cache, não há invalidação. Cada `readResource` faz uma query fresca no SQLite. Para 11 views simples com <100 linhas cada, performance é irrelevante. Se o banco crescer muito, pode-se adicionar cache simples.
- **[Risco] `@modelcontextprotocol/sdk` é v1.x** → O README indica que v2 está em desenvolvimento (pre-alpha). V1 é estável e recomendado para produção. Migration para v2 no futuro pode ter breaking changes. Mitigação: fixar versão no package.json.
