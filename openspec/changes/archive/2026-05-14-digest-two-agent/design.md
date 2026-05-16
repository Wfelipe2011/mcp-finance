## Context

O `digestAgent.ts` atual usa `createAgent({ responseFormat: MonthlyDigestSchema })` para gerar, em um único LLM call, uma narrativa analítica em português + campos estruturados (flags, notable_expenses, structured_summary). O Gemma-4 local usa ToolStrategy: converte o schema Zod em tool definition e o modelo precisa fazer um tool_call.

O problema é que preencher um schema complexo enquanto também gera narrativa livre de qualidade são tarefas concorrentes. O modelo tende a "economizar" raciocínio, produzindo narrativas genéricas.

**Estado atual:**
- 1 agent, 1 LLM call por digest
- `MonthlyDigestSchema`: `narrative_pt` (string), `structured_summary` (record), `flags` (string[]), `notable_expenses` (array de objetos)
- Servidor: Gemma-4 em `http://192.168.0.209:8080/v1` (OpenAI-compatible, sem suporte a json_schema nativo)

## Goals / Non-Goals

**Goals:**
- Melhorar a qualidade da narrativa analítica gerada pelo digest
- Manter interface pública de `generateDigest()` idêntica
- Não alterar banco de dados, scripts, ou schemas Zod

**Non-Goals:**
- Mudar o `MonthlyDigestSchema` ou o `DigestRow` do BunPgAdapter
- Paralelizar os dois agents (devem ser sequenciais — o segundo depende do primeiro)
- Adicionar novos campos ao digest

## Decisions

### Decisão 1: Agent 1 retorna string livre, sem schema

**Escolha**: Agent 1 usa `createAgent` sem `responseFormat`, e lê `result.content` (texto puro).

**Alternativa considerada**: Agent 1 com schema simples `{ analysis: z.string() }`.

**Rationale**: Sem schema, o modelo não precisa fazer tool_call — responde diretamente em texto. Isso elimina overhead e maximiza a liberdade de raciocínio. O `result.content` do langchain contém o texto da última mensagem do modelo.

### Decisão 2: Agent 2 recebe apenas o texto analítico como contexto

**Escolha**: O prompt do Agent 2 inclui o texto gerado pelo Agent 1 + instrução para extrair campos estruturados. Não repassa os dados brutos do mês.

**Rationale**: Reduz o tamanho do contexto do Agent 2, focando na extração. Os dados brutos já foram processados pelo Agent 1 na narrativa.

### Decisão 3: Reutilizar a mesma instância de `model`

**Escolha**: Ambos os agents usam `import { model } from "./model.ts"`.

**Rationale**: Sem estado entre calls — reutilizar a instância é seguro e evita overhead de inicialização.

### Decisão 4: Guard para Agent 1 sem resposta

**Escolha**: Se `result.content` for vazio ou undefined no Agent 1, lançar erro antes de chamar o Agent 2.

**Rationale**: Falha rápida e mensagem clara. Sem sentido extrair estrutura de texto vazio.

## Risks / Trade-offs

- **[Risco] 2× custo de LLM calls** → Aceitável: digest roda 1×/mês por mês histórico. Latência não é crítica.
- **[Risco] Agent 1 pode incluir texto informal** que dificulta extração do Agent 2 → Mitigação: prompt do Agent 1 instrui formato estruturado mas em linguagem natural (seções claras)
- **[Risco] `result.content` pode ter formato diferente por versão do langchain** → Mitigação: verificar tipo antes de usar; fallback para `String(result.content)`
