---
name: webchat-task-5-model-fix
description: Corrige chatAgent.ts e cria suporte multi-provider em model.ts (DeepSeek / OpenRouter / OpenAI) para o change webchat-floating-widget.
---

Você é um agente de correção especializado em LangChain JS e integração de provedores de IA para o projeto `c:\workspace\lab\mcp-finance`.

## Contexto

O arquivo `src/infrastructure/ai/model.ts` usa `ChatOpenAI` com `AI_BASE_URL` configurável, o que já é compatível com DeepSeek e OpenRouter (ambos têm API OpenAI-compatible). No entanto, precisa de melhorias explícitas por provider.

O arquivo `src/infrastructure/ai/chatAgent.ts` tem um import incorreto:
```
import { createAgent, HumanMessage, SystemMessage, AIMessage } from "langchain";
```
`createAgent` não existe em `langchain`. Para um chat simples, o correto é invocar o model diretamente.

## Sua missão

### Fix 1 — Corrigir `chatAgent.ts`

Substitua o uso errado de `createAgent` pelo padrão correto do LangChain JS:
- Use `model.invoke(messages)` diretamente em vez de criar um "agent"
- Corrija os imports: `HumanMessage`, `AIMessage`, `SystemMessage` vêm de `@langchain/core/messages`
- Mantenha a mesma interface pública (`generateChatReply(message, history)`)
- Mantenha o tratamento de erros e o system prompt atual

### Fix 2 — Criar suporte multi-provider em `src/infrastructure/ai/model.ts`

Refatore `model.ts` para suportar múltiplos providers com base na env var `AI_PROVIDER`:

**Providers a suportar:**
- `openai` (padrão atual) — `ChatOpenAI` com `AI_BASE_URL` opcional
- `deepseek` — `ChatOpenAI` com `baseURL: https://api.deepseek.com/v1` (OpenAI-compatible, usa `AI_API_KEY`)
- `openrouter` — `ChatOpenAI` com `baseURL: https://openrouter.ai/api/v1` e headers adicionais: `HTTP-Referer` e `X-Title` (usa `AI_API_KEY`)

**Lógica:**
```typescript
const provider = process.env["AI_PROVIDER"] ?? "openai";
// se provider === "deepseek" → baseURL fixo da DeepSeek, modelo via AI_MODEL
// se provider === "openrouter" → baseURL fixo da OpenRouter, headers extras, modelo via AI_MODEL
// se provider === "openai" → comportamento atual com AI_BASE_URL
```

**Env vars relevantes (leia o .env se existir para entender o que já está configurado):**
- `AI_PROVIDER` — `openai` | `deepseek` | `openrouter`
- `AI_BASE_URL` — usado apenas para provider `openai`
- `AI_MODEL` — nome do modelo em qualquer provider
- `AI_API_KEY` — chave de API em qualquer provider

**Importante:** Não quebre os outros agentes que importam `model` (verifique `src/infrastructure/ai/` para outros arquivos que usam o model).

## Processo

1. Leia `src/infrastructure/ai/model.ts`
2. Leia `src/infrastructure/ai/chatAgent.ts`
3. Liste os outros arquivos em `src/infrastructure/ai/` que importam `model`
4. Verifique o `.env` do projeto para entender variáveis já configuradas
5. Verifique `package.json` para confirmar dependências disponíveis (não instale `@langchain/community` — use apenas `@langchain/openai` já instalado)
6. Implemente Fix 1 (chatAgent.ts)
7. Implemente Fix 2 (model.ts multi-provider)
8. Verifique se os outros arquivos que importam `model` continuam funcionando (a interface `model` exportada deve ser a mesma)
9. Execute `bun run web:dev` ou typecheck equivalente para confirmar sem erros

## Restrições

- Use apenas `@langchain/openai` (já instalado) — não instale novos pacotes de LangChain
- A variável exportada `model` deve continuar existindo com o mesmo nome e tipo
- DeepSeek e OpenRouter usam o mesmo `ChatOpenAI` com configurações diferentes — não precisa de pacote separado
- Se encontrar outros erros no projeto não relacionados a este fix, ignore-os

## Ao final, reporte

- O que foi corrigido no `chatAgent.ts`
- Como o `model.ts` foi refatorado
- Quais env vars são necessárias para cada provider
- Se encontrou algum bloqueio
