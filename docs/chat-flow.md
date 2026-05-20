# Chat Flow — Agente LangChain + MCP

> **Change:** `chat-mcp-seguranca-memoria`
> **Atualizado em:** 2026-05-20

## Visão geral

```
Cliente (browser)
  │
  ▼ POST /api/chat  { message: string }
HTTP Handler (src/application/web/routes/chat.ts)
  │  tenantId, userId, role → do JWT (auth-middleware.ts)
  ▼
ChatOrchestrator.orchestrateChat(message, { tenantId, userId, role })
  │
  ▼
McpClient.processarMensagemDoChat(message, { tenantId, userId, role })
  │
  ├─ 1. getAgentSingleton({ role })  ─────── lazy init por role
  │       ├─ getMcpClient()                  MultiServerMCPClient (singleton)
  │       │    └─ StreamableHTTP → :3002/mcp
  │       ├─ rawTools = await mcpClient.getTools()
  │       ├─ filteredTools = filterToolsByRole(rawTools, role)
  │       ├─ wrappedTools = buildWrappedTools(filteredTools)
  │       │    ├─ remove tenant_id do schema exposto ao LLM
  │       │    └─ injeta tenant_id autenticado ao executar a tool
  │       └─ createAgent(model, wrappedTools, { stateSchema, checkpointer,
  │                       middleware: [tenantToolSecurityMiddleware,
  │                                    summarizationMiddleware] })
  │
  └─ 2. agent.invoke(
            { messages: [HumanMessage], tenantId, userRole: role },
            {
              configurable: { thread_id: `${tenantId}:${userId}`, tenantId, userRole: role },
              context: { tenantId, userRole: role }
            }
         )
         └─ LLM decide → tool call
               └─ tenantToolSecurityMiddleware sobrescreve args.tenant_id
                    └─ wrappedTool.func(args, _, config)
                         ├─ tenant_id = state/context/configurable autenticado
                         └─ toolOriginal.func({ ...args, tenant_id })
                         └─ POST :3002/mcp (servidor MCP interno)
```

## Componentes

### `auth-middleware.ts` — Extração de identidade do JWT

Verifica o JWT e extrai:

| Campo JWT | Código | Descrição |
|-----------|--------|-----------|
| `tenant_id` | `tenantId` | UUID do inquilino |
| `sub` | `userId` | UUID do usuário |
| `role` | `role` (`"member"` \| `"admin"`) | Nível de acesso |

Os três valores são passados como parâmetros autenticados — **nunca lidos do body da requisição**.

### `chat.ts` — Handler HTTP

```
POST /api/chat
  body: { message: string; history?: Array<{ role, content }> }

Valida entrada → chama orchestrateChat(message, { tenantId, userId, role })
```

### `ChatOrchestrator.ts` — Ponto de entrada do agente

Função única `orchestrateChat` que delega para `processarMensagemDoChat`.
Mantida como camada de separação entre o handler HTTP e a implementação do agente.

### `McpClient.ts` — Agente LangChain

#### Gerenciamento de tools

**`filterToolsByRole(tools, role)`**
Filtra tools restritas a administradores:

```typescript
const ADMIN_ONLY_TOOLS = new Set(["get_pipeline_health", "get_sync_status"]);

// role === "member" → remove ADMIN_ONLY_TOOLS
// role === "admin"  → retorna todas
```

**`buildWrappedTools(rawTools)`**
Envolve cada `DynamicStructuredTool` para remover `tenant_id` do schema exposto ao LLM e **sobrescrever** o `tenant_id` com o valor autenticado durante a execução:

```typescript
const schemaSemTenantId = removeTenantIdFromSchema(rawTool.schema);
const tenantId = resolveAuthenticatedTenantId(config);
return originalTool.func({ ...args, tenant_id: tenantId }, ...);
```

**Por que isso é necessário?**
O LLM não precisa conhecer o tenant e não deve pedir UUID ao usuário. O wrapper garante que o `tenant_id` usado na chamada ao servidor MCP sempre vem do contexto autenticado (JWT), nunca da saída do modelo.

#### Checkpointer — Memória persistente

```typescript
function createCheckpointer() {
  if (process.env.NODE_ENV !== "production") {
    return new MemorySaver();  // in-process, reinicia a cada deploy
  }
  return PostgresSaver.fromConnString(DATABASE_URL);  // persistente por tenant/usuário
}
```

O checkpointer é inicializado via `setupCheckpointer()` no boot do servidor antes de aceitar conexões.

#### Thread ID — Isolamento de memória

```
thread_id = `${tenantId}:${userId}`
```

Cada usuário (por tenant) tem um histórico de conversa separado. Usuários do mesmo tenant não compartilham contexto.

#### Middleware de sumarização

```typescript
summarizationMiddleware({
  model,
  trigger: { tokens: 4_000 },
  keep: { messages: 20 },
})
```

Quando o histórico excede 4.000 tokens, o middleware sumariza as mensagens mais antigas e mantém as 20 mais recentes, evitando context overflow.

#### Cache de agentes por role

```typescript
const agentCache = new Map<AgentUserRole, CompiledStateGraph>();
```

O agente é construído uma vez por role (`member` / `admin`) e reutilizado entre requests. A filtragem de tools acontece na construção do agente.

## Segurança

| Vetor de risco | Mitigação implementada |
|----------------|------------------------|
| LLM pede `tenant_id` ao usuário | `buildWrappedTools` remove `tenant_id` do schema visível ao LLM e o prompt proíbe pedir UUID |
| LLM injeta `tenant_id` nos args da tool | `tenantToolSecurityMiddleware` e `buildWrappedTools` sobrescrevem com tenant autenticado |
| Usuário member chama tools admin | `filterToolsByRole` remove tools da lista antes de criar o agente |
| Thread ID compartilhado entre usuários | `thread_id = tenantId:userId` garante isolamento por usuário |
| `tenant_id` lido do body da requisição | `tenantId` vem exclusivamente do JWT (`verifyAuth`) |

## Fluxo de erros

O handler `chat.ts` captura exceções de `orchestrateChat`:

```
McpTimeoutError  → log tipo=TIMEOUT, HTTP 500 genérico
McpToolError     → log tipo=MCP_TOOL_ERROR, HTTP 500 genérico
McpParseError    → log tipo=MCP_PARSE_ERROR, HTTP 500 genérico
Error genérico   → log tipo=ERRO_INTERNO, HTTP 500 genérico
```

O handler atual retorna erro HTTP 500 genérico para falhas não tratadas do agente, sem vazar stack trace ou mensagens internas ao cliente. As classes de erro MCP são mantidas para compatibilidade do handler e evolução futura do mapeamento de status.

## Tool calling

Não existe mais uma camada de `detectIntent()` por palavra-chave nem naturalização por template. O modelo decide qual tool usar a partir da pergunta e dos schemas disponíveis, e a resposta final é gerada pelo próprio agente em pt-BR.

As tools disponíveis vêm do servidor MCP interno e passam por dois filtros antes de chegar ao LLM:

1. `filterToolsByRole` remove tools administrativas para usuários `member`.
2. `buildWrappedTools` remove parâmetros autenticados, como `tenant_id`, do schema visível ao LLM.

## Decisões de arquitetura

### Agente lazy por role

O agente não é construído no import do módulo. A primeira chamada de chat cria o cliente MCP, busca as tools, aplica filtros/wrappers e guarda o agente em cache por role (`member` ou `admin`). Isso permite que a API web suba mesmo que o MCP esteja temporariamente indisponível.

### Memória por usuário

O histórico é isolado por `thread_id = tenantId:userId`. Em desenvolvimento o checkpointer usa `MemorySaver`; em produção usa `PostgresSaver` e roda `setup()` no boot da API.

## Arquivos relevantes

| Arquivo | Papel |
|---------|-------|
| `src/application/web/routes/chat.ts` | Endpoint HTTP, validação e delegação |
| `src/infrastructure/mcp/ChatOrchestrator.ts` | Ponto de entrada entre handler HTTP e agente |
| `src/infrastructure/mcp/McpClient.ts` | Agente LangChain, wrappers de tools, checkpointer e cliente MCP |
| `src/scripts/mcp.ts` | Servidor MCP (fora de escopo deste change) |
