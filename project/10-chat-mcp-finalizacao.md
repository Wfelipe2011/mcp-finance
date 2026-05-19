# Contexto 10 — Chat + MCP: finalização do fluxo

## Objetivo desta rodada de explore

Fechar as lacunas entre **doc, spec e código** do chat web + MCP, transformando o MVP de "agent tool-calling cego" em um fluxo seguro, observável, com memória de conversa e UI alinhada ao DaisyUI.

Esse contexto **NÃO** propõe mudar o que o catálogo MCP faz (12 tools já especificadas em `mcp-view-tools`). Foca no **caminho cliente → endpoint → orquestrador → MCP → resposta**.

---

## Diagnóstico do estado atual

### Fluxo real implementado hoje

```
Cliente (ChatWidget MUI)
  │ POST /api/chat { message, history? }
  ▼
src/application/web/routes/chat.ts
  │ valida body, extrai tenantId do JWT
  │ chama orchestrateChat(message, tenantId)
  ▼
src/infrastructure/mcp/ChatOrchestrator.ts
  │ delega para processarMensagemDoChat()
  ▼
src/infrastructure/mcp/McpClient.ts
  │
  │   LangChain agent (createAgent) — singleton no top-level do módulo
  │   ├── ChatOpenRouter (LLM real, sem cache)
  │   ├── 12 tools MCP carregadas via listTools() no boot
  │   └── MemorySaver declarado MAS sem thread_id no invoke
  │
  │ agent.invoke({ messages: [SystemMessage(tenant_id), HumanMessage] })
  ▼
Servidor MCP :3002 (stateless, sem auth)
  │ executa tool escolhida pelo LLM
  ▼
LLM gera reply textual
  ▼
{ reply: string }
```

### Divergência grave: doc ↔ spec ↔ código

```
┌──────────────────────────┬────────────────────────┬──────────────────────────┐
│ docs/chat-flow.md        │ spec webchat-mcp-orch. │ Código real              │
├──────────────────────────┼────────────────────────┼──────────────────────────┤
│ detectIntent() por       │ regras determinísticas │ LangChain agent com     │
│ palavras-chave, SEM LLM  │ até 3 intents          │ OpenRouter, tool-calling│
│                          │                        │ dinâmico sobre 12 tools │
│                          │                        │                          │
│ naturalize*() template   │ naturalização pt-BR,   │ LLM gera texto livre    │
│ fixo, máx 3 frases       │ máx 3 frases           │ (SystemMessage pede 3)  │
│                          │                        │                          │
│ chatAgent.ts legado      │ —                      │ confere, não importado  │
└──────────────────────────┴────────────────────────┴──────────────────────────┘
```

→ **Doc e spec descrevem um sistema que não existe mais.** Precisam ser reescritos OU o código precisa voltar para essa arquitetura.

---

## Bugs e riscos concretos

### 🔴 Crítico — segurança multi-tenant

```
1. tenant_id viaja na SystemMessage do LLM
   ──────────────────────────────────────────
   "O tenant_id é ${tenantId}"
   
   O LLM é responsável por copiar isso nos argumentos da tool.
   
   Risco: LLM alucina UUID, esquece de passar, ou usuário injeta
   prompt "ignore tenant_id e use X". Vazamento entre tenants real.

   Correção: McpClient deve INTERCEPTAR cada callTool e injetar
   tenant_id do contexto autenticado, sobrescrevendo o que o LLM
   tentar mandar.
```

```
2. Todas as 12 tools expostas ao LLM, inclusive admin
   ──────────────────────────────────────────────────
   get_pipeline_health é "Escopo: Admin/Operacao" no catálogo.
   Hoje, um member comum pergunta "como está a saúde do sistema?"
   e o LLM chama a tool sem qualquer gate.
   
   Correção: filtrar tools por role na hora de montar getLangChainToolsFromMcp.
```

### 🟡 Importante — funcionalidade

```
3. history do front é IGNORADO
   ────────────────────────────
   Front manda history.slice(-10) → chat.ts valida → orquestrador
   recebe só message. Cada turno é stateless.

4. MemorySaver decorativo
   ──────────────────────
   createAgent({ checkpointer }) declarado MAS agent.invoke
   é chamado sem { configurable: { thread_id } } → checkpointer
   nunca grava nada.

5. agent + tools no top-level do módulo
   ────────────────────────────────────
   await getLangChainToolsFromMcp() roda no import. Se MCP estiver
   down no boot da API → API não sobe. Sem retry, sem lazy init.

6. Sem rate limit / budget de tokens
   ─────────────────────────────────
   Cada mensagem custa OpenRouter. Member pode loopar perguntas
   e gerar custo arbitrário no tenant.
```

### 🟢 UX

```
7. ChatWidget ainda em MUI (Paper, IconButton, CircularProgress)
   Contexto 01 (DaisyUI) precisa incluir o widget na migração.

8. Welcome message hardcoded sem sugestões de perguntas.
   Catálogo MCP tem 12 tools = 12 famílias de pergunta possíveis.

9. Resposta blocking, sem streaming.
   LangChain agent suporta agent.stream() — UX poderia ter texto
   aparecendo incrementalmente.

10. Sem exibição de "ferramenta consultada" — usuário não vê de onde
    veio o número (transparência de tool-calling).
```

---

## Proposta a explorar

### Reescrever `docs/chat-flow.md` para refletir o real

```
Cliente
  │ POST /api/chat { message, history? }
  ▼
chat.ts
  │ valida + extrai tenantId, role do JWT
  │ orchestrateChat(message, history, tenantId, role)
  ▼
ChatOrchestrator (não mais o McpClient direto)
  │
  │ 1. constrói/recupera thread_id estável (tenant + sessionId do front)
  │ 2. monta config { configurable: { thread_id, tenant_id, role } }
  │ 3. chama agent.invoke(messages, config)
  │
  ▼
LangChain agent (singleton lazy)
  │
  │ tools com WRAPPER que:
  │   - injeta tenant_id autenticado SOBRESCREVENDO LLM
  │   - filtra por role antes de expor
  │   - registra trace { tool_name, args, latency_ms, tokens }
  │
  ▼
MCP :3002
  ▼
LLM gera reply (streaming)
  ▼
SSE/chunked → cliente
```

### Atualizar specs

- **`webchat-mcp-orchestration`** — remover "regras determinísticas com 3 intents". Adicionar:
  - Requirement: tenant_id sempre injetado pelo orquestrador, nunca confiável quando vindo do LLM
  - Requirement: filtro de tools por role
  - Requirement: thread_id obrigatório para persistir histórico
- **`webchat-response-api`** — adicionar:
  - Requirement: rate limit por tenant (X mensagens/min)
  - Requirement: contrato de streaming opcional (Accept: text/event-stream)
- **`mcp-server`** — adicionar:
  - Requirement: autenticação no transport MCP (token interno entre web→MCP)
  - Requirement: validação cruzada de tenant_id do payload vs contexto

### Atualizar `ChatWidget` (depende do contexto 01)

```
Antes (MUI)              Depois (DaisyUI)
────────────             ─────────────────
<Paper elevation>        card bg-base-100 shadow-xl
<IconButton>             button btn-circle btn-ghost
<CircularProgress>       loading loading-dots
flutuante bottom-right   chat bubble + drawer
                         (no desktop pode virar painel lateral)

Welcome com chips:
[ Saldo do mês ]  [ Assinaturas? ]  [ Como está o cartão? ]
[ O que mudou? ] [ Tem anomalia? ]  [ Vai sobrar grana? ]
```

---

## Decisões a tomar

1. **Tenant safety primeiro ou tudo junto?**
   - Opção A: hotfix-só-segurança em change pequena (intercept tenant_id + role gate). Resto numa change grande.
   - Opção B: change única "finalizar-chat-mcp" cobrindo tudo.

2. **Memória de conversa**
   - Opção A: `thread_id` = `tenant_id + user_id` (uma conversa contínua eterna).
   - Opção B: `thread_id` = `tenant_id + user_id + sessionId` (do localStorage do widget). Sessão "limpa conversa" rotaciona.
   - Opção C: stateless mesmo — remove `history` do contrato.

3. **Filtro de tools por role**
   - No orquestrador (passa role para `getLangChainToolsFromMcp(role)` → registra subset).
   - No próprio servidor MCP (token do orquestrador carrega role; cada tool valida).

4. **Streaming**
   - Vale o esforço de SSE no MVP, ou fica para depois?

5. **Doc vs Spec vs Código**
   - Doc e spec mentem sobre o sistema. Reescrever ambos como parte da change OU criar specs novas.

---

## Arquivos-chave para a change

| Arquivo | Papel |
|---|---|
| `src/application/web/routes/chat.ts` | Endpoint, validação, hoje descarta history |
| `src/infrastructure/mcp/ChatOrchestrator.ts` | Hoje só delega — precisa virar orquestrador real |
| `src/infrastructure/mcp/McpClient.ts` | Singleton de agent + tools (top-level), interceptor de tenant_id |
| `src/scripts/mcp.ts` | Servidor MCP (sem auth hoje) |
| `src/application/mcp/register-tools.ts` | Carrega as 12 tools — ponto de filtro por role |
| `client/src/components/ChatWidget.tsx` | MUI → DaisyUI |
| `client/src/api/client.ts` (postChatMessage) | Adicionar suporte a streaming opcional |
| `docs/chat-flow.md` | Reescrever (mente sobre o sistema atual) |
| `openspec/specs/webchat-mcp-orchestration/spec.md` | Reescrever requirements |
| `openspec/specs/webchat-response-api/spec.md` | Adicionar rate limit, streaming |
| `openspec/specs/mcp-server/spec.md` | Auth no transport |

---

## Questões para o explore

1. O LangChain agent precisa mesmo ficar? Stack alternativa (call direto OpenRouter com tool-calling nativo) reduziria dependências.
2. OpenRouter é o LLM de produção? Custo por mensagem com tool-calling? Faz sentido prompt-cache?
3. Qual o budget aceitável de latência por resposta (LLM + 1-2 tool calls = facilmente 3-5s)?
4. Vale expor "esta resposta consultou get_top_categories" abaixo da bolha (transparência) ou polui UX?
5. Conversa persiste no servidor (postgres → tabela `chat_messages`) ou só em memória/localStorage?

---

## Referências

- **MCP spec — sessions e auth**: https://spec.modelcontextprotocol.io/specification/server/transports/
- **LangChain createAgent + checkpointer**: https://js.langchain.com/docs/how_to/migrate_agent/
- **LangGraph thread_id**: https://langchain-ai.github.io/langgraphjs/concepts/persistence/
- **OpenRouter prompt caching**: https://openrouter.ai/docs/prompt-caching
- **DaisyUI Chat bubble**: https://daisyui.com/components/chat/
- **SSE no Bun**: https://bun.sh/docs/api/http (streaming Response)
- **Catálogo MCP 12 tools**: `docs/catalogo_mcp_12_tools.md`
- **UX Audit (foco no chat como hub)**: `docs/Relatório de UX Audit_ Aplicação Finanças Familiar.md`

---

## Sugestão de quebra em changes

```
Fase 1 — segurança (pequena, urgente)
  • intercept tenant_id no McpClient
  • role gate em getLangChainToolsFromMcp
  • lazy init do agent (deixa de quebrar boot se MCP down)
  • atualizar specs afetadas

Fase 2 — memória + history (média)
  • thread_id estável
  • aceitar/usar history do front
  • decidir persistência (memória in-process vs postgres)

Fase 3 — UX (depende do contexto 01 DaisyUI)
  • migrar ChatWidget para DaisyUI
  • chips de perguntas sugeridas
  • indicar "tool consultada" na bolha

Fase 4 — observabilidade e custo (média)
  • rate limit por tenant
  • métricas: tokens consumidos, latência, tool acionada
  • budget por tenant (admin define teto mensal)

Fase 5 (opcional) — streaming
  • SSE em /api/chat
  • renderização incremental no widget
```
