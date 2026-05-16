## Why

Hoje o `digestAgent` analisa cada mês de forma isolada — não sabe o que aconteceu nos meses anteriores. O resultado é uma narrativa sem fio: não há evolução, não há "você melhorou em março mas abril regrediu". A tabela `ai_monthly_digest` já armazena todos os digests históricos; só falta alimentar o agente com esse contexto antes de ele analisar o mês corrente.

## What Changes

- `BunPgAdapter.aiDigests` ganha método `getPreviousDigests(year, month, limit)` — retorna os últimos N digests anteriores ao mês alvo
- `digest.ts` busca os 3 meses anteriores e passa para `generateDigest()`
- `digestAgent.ts` recebe o histórico e constrói um prompt com linha do tempo de métricas
- O Agent 1 (análise livre) recebe contexto dos meses anteriores no `HumanMessage`

## Capabilities

### New Capabilities

- `digest-memory`: Narrativa evolutiva — agente detecta tendências entre meses consecutivos (ex: "gastos com alimentação cresceram 3 meses seguidos", "julho foi o melhor mês do ano até agora")

### Modified Capabilities

- `ai-digest-pipeline`: Adiciona histórico como input; output mais rico em comparações temporais

## Impact

- Nenhuma migração de schema — `ai_monthly_digest` já existe e tem os dados
- Apenas TypeScript: `BunPgAdapter.ts`, `digest.ts`, `digestAgent.ts`
- Primeiros meses (sem histórico) degradam graciosamente — prompt omite a seção de histórico quando não há dados anteriores
- Custo de tokens ligeiramente maior (3 meses de context adicional ~500 tokens)
