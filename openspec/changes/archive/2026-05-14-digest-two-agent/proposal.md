## Why

O `digestAgent` atual usa um único LLM call para gerar simultaneamente uma narrativa analítica em português e extrair campos estruturados (flags, notable_expenses, structured_summary). Isso prejudica a qualidade da narrativa, pois o modelo divide a atenção entre raciocínio livre e preenchimento de schema, resultando em análises superficiais. A separação em dois agentes permite que o primeiro raciocine livremente e o segundo extraia com precisão.

## What Changes

- O `digestAgent.ts` passa a usar dois agents em sequência:
  1. **Agent 1 (análise)**: recebe os dados do mês e gera um texto analítico livre em português, sem schema
  2. **Agent 2 (extração)**: recebe o texto do Agent 1 e extrai os campos estruturados (`narrative_pt`, `flags`, `notable_expenses`, `structured_summary`)
- O `MonthlyDigestSchema` permanece o mesmo — apenas o fluxo interno do agente muda
- A interface pública de `generateDigest()` permanece idêntica (mesmos inputs/outputs)
- Nenhuma mudança no banco de dados ou nos scripts

## Capabilities

### New Capabilities

- `digest-two-agent`: Pipeline de dois estágios para geração do digest mensal — análise livre seguida de extração estruturada

### Modified Capabilities

<!-- nenhuma spec existente muda em nível de requisitos -->

## Impact

- **Modificado**: `src/infrastructure/ai/digestAgent.ts` — lógica interna refatorada
- **Não afetado**: `MonthlyDigestSchema.ts`, `digest.ts`, `BunPgAdapter.ts`, banco de dados
- **Custo**: 2× calls ao modelo por execução do digest (aceitável dado que digest roda 1×/mês)
