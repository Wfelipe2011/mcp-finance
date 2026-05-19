# Fluxo técnico do chat — web → MCP → naturalização

> **Change:** `chat-endpoint-via-mcp`
> **Atualizado em:** 2026-05-17

## Visão geral

```
Cliente (browser)
  │
  │  POST /api/chat  { message, history? }
  ▼
Servidor Web — porta 3001
  │  src/application/web/routes/chat.ts
  │  → valida body (message obrigatório, history opcional)
  │  → extrai tenantId do JWT autenticado (nunca do body)
  │  → chama orchestrateChat(message, tenantId)
  │
  ▼
ChatOrchestrator — src/infrastructure/mcp/ChatOrchestrator.ts
  │  1. detectIntent(message)          — palavras-chave, sem LLM
  │  2. buildArgs(intent, tenantId)    — monta argumentos da tool
  │  3. callMcpTool(toolName, args)    — JSON-RPC para servidor MCP
  │
  │  POST http://localhost:3002 (MCP_BASE_URL)
  ▼
Servidor MCP — porta 3002
  │  src/scripts/mcp.ts  (NÃO alterado por este change)
  │  executa a tool correspondente à intent
  │  retorna payload estruturado (JSON)
  │
  ▼
ChatOrchestrator (continua)
  │  4. naturalize*(payload)  — template pt-BR, máx 3 frases
  │  5. fallback seguro se intent desconhecida ou erro MCP
  │
  ▼
Servidor Web (retorna ao cliente)
  │  { reply: string }
  ▼
Cliente
```

## Intents suportadas (MVP)

| Intent                    | Tool MCP                    | Acionada por                          |
|---------------------------|-----------------------------|---------------------------------------|
| `get_monthly_balance`     | `get_monthly_balance`       | "saldo", "receita", "despesa", "mês"  |
| `get_subscription_analysis` | `get_subscription_analysis` | "assinatura", "recorrência", "mensalidade" |
| `get_credit_card_status`  | `get_credit_card_status`    | "cartão", "fatura", "limite"          |
| `unknown`                 | —                           | qualquer outra mensagem               |

## Decisões de arquitetura

### chatAgent.ts e model.ts

- `src/infrastructure/ai/chatAgent.ts` — **descontinuado** para o caminho do chat.
  Não é importado por nenhum módulo web após este change.
  Mantido no repositório pois pode ser reaproveitado em outros contextos (agentes de enriquecimento, digest etc.).

- `src/infrastructure/ai/model.ts` — **ativo**, utilizado por `digestAgent.ts`, `enrichAgent.ts` e `forecastAgent.ts`.
  Não foi removido.

### Sem LLM no caminho crítico

A detecção de intent é puramente determinística (regex/palavras-chave), eliminando latência e custo de LLM no hot-path do chat.
A naturalização usa templates fixos em pt-BR, não modelos generativos.

## Arquivos relevantes

| Arquivo | Papel |
|---------|-------|
| `src/application/web/routes/chat.ts` | Endpoint HTTP, validação e delegação |
| `src/infrastructure/mcp/ChatOrchestrator.ts` | Orquestração: intent → MCP → resposta |
| `src/infrastructure/mcp/McpClient.ts` | Cliente JSON-RPC para o servidor MCP |
| `src/scripts/mcp.ts` | Servidor MCP (fora de escopo deste change) |
| `src/infrastructure/ai/chatAgent.ts` | Legado — descontinuado para o chat |
| `src/infrastructure/ai/model.ts` | Modelo LLM — usado por outros agentes |
