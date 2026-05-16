## Context

O `FinanceMcpServer` atual registra 11 Resources MCP + 1 Tool (`sync`). Resources usam um protocolo separado (`resources/list`, `resources/read`) que muitos clientes MCP não implementam. A mudança converte todos os Resources em Tools, mantendo `sync` intacto e adicionando parâmetros de janela temporal a 4 das 11 novas tools.

A única dependência relevante: `FinanceQueryDb.queryView(sql: string)` aceita SQL arbitrário — isso é suficiente para SQL dinâmico sem nenhuma mudança de infraestrutura.

## Goals / Non-Goals

**Goals:**
- Substituir 11 Resources por 11 Tools de leitura com mesma semântica de dados
- Adicionar parâmetros opcionais com defaults idênticos às views atuais (sem regressão)
- Garantir segurança contra SQL injection nos parâmetros interpolados
- Mudança cirúrgica: apenas `FinanceMcpServer.ts`

**Non-Goals:**
- Alterar as views SQL existentes (continuam como referência/documentação)
- Adicionar autenticação ou rate limiting
- Parametrizar as 7 tools sem janela temporal

## Decisions

**D1 — Tools sem parâmetros consultam a view SQL diretamente**

As 7 tools estáticas (`get_overview`, `get_bank_summary`, etc.) continuam com `SELECT * FROM v_<name>` via `db.queryView()`. Não há razão para gerar SQL dinâmico onde não há parâmetros — simplicidade máxima.

**D2 — Tools parametrizadas geram SQL inline (não novas views)**

A alternativa seria criar views SQLite com parâmetros via tabelas temporárias ou `WITH` parametrizado — impraticável em SQLite sem extensões. A solução correta é construir a query na camada TypeScript com parâmetros já validados pelo Zod.

**D3 — Validação Zod antes da interpolação (segurança)**

SQLite não aceita bind parameters em `DATE('now', '-? days')`. A interpolação direta é segura desde que os valores sejam inteiros validados:
```typescript
z.number().int().min(1).max(365)
```
Após validação Zod, `days` é garantidamente um número inteiro — sem superfície de injection.

**D4 — Parâmetros e defaults por tool**

| Tool | Parâmetros | Defaults | Limites |
|------|-----------|---------|---------|
| `get_monthly_cashflow` | `months` | 13 | 1–36 |
| `get_spending_by_cat` | `short_days`, `long_days` | 30, 90 | 1–90 / 2–180 |
| `get_top_categories` | `days`, `limit` | 30, 10 | 7–90 / 1–50 |
| `get_budget_5030_20` | `spending_days`, `income_months` | 30, 3 | 1–90 / 1–12 |

Defaults idênticos às janelas hardcoded atuais → zero regressão para clientes que não passam parâmetros.

**D5 — `get_spending_by_cat` mantém duas colunas com parâmetros separados**

`short_days` e `long_days` independentes permitem comparar janelas arbitrárias (ex: 15d vs 45d). A coluna `total_short` corresponde a `short_days` e `total_long` a `long_days`. Constraint: `short_days < long_days` validado pelo Zod com `.refine()`.

**D6 — Capabilities: remove `resources: {}`, mantém `tools: {}`**

O `McpServer` é instanciado com `{ capabilities: { tools: {} } }` — sem `resources`. Clientes que fazem `resources/list` receberão resposta vazia ou erro de capability não suportada.

## Risks / Trade-offs

- **[Breaking] Clientes usando `resources/read`** → Precisam migrar para `tools/call`. Mitigação: documentado no proposal como breaking change explícito.
- **[SQL dinâmico] Manutenção da lógica SQL no TypeScript** → A lógica das 4 queries parametrizadas fica duplicada (view SQL + TypeScript). Mitigação: view SQL continua como documentação canônica; TypeScript é a versão parametrizada.
- **[Limites dos parâmetros] Usuário pode pedir `months=36`** → Query mais pesada, mas SQLite com WAL e índice em `date` aguenta tranquilamente para ~3000 transações.
- **[`short_days >= long_days`]** → Zod `.refine()` rejeita antes de chegar ao SQL.
