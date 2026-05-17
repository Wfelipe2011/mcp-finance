## Why

O campo `notable_expenses` (e `structured_summary`) do digest mensal está sendo armazenado no banco como uma **string JSON** em vez de um valor JSONB nativo — quando o modelo de IA retorna uma string serializada, o código faz `JSON.stringify(string)` ao persistir, produzindo um double-encoded JSONB. Na leitura, o Bun Postgres retorna o valor como `string` em vez de `array`, causando crash na aba Insights (`TypeError: expenses.map is not a function`).

## What Changes

- Corrigir o parse de `notable_expenses` na leitura do banco (`BunPgAdapter.getDigestData` e `getDigestMensal`) — se o valor for string, fazer `JSON.parse` antes de retornar
- Corrigir o parse de `structured_summary` igualmente, pois tem o mesmo problema
- Adicionar guard defensivo em `NotableExpenses.tsx` para checar `Array.isArray` antes de chamar `.map()`
- Corrigir na origem o `upsertDigest`: se `notable_expenses` já for string, não fazer `JSON.stringify` novamente (evitar double-encoding)

## Capabilities

### New Capabilities

- `digest-jsonb-safe-read`: Leitura segura de campos JSONB do digest — parse defensivo de string→objeto/array na camada de infraestrutura

### Modified Capabilities

- `ai-digest-pipeline`: Persistência do digest corrigida para não double-encode campos JSONB quando o modelo retorna strings

## Impact

- `src/infrastructure/db/BunPgAdapter.ts` — métodos `getDigestData`, `getDigestMensal`, `upsertDigest`
- `client/src/components/NotableExpenses.tsx` — guard defensivo `Array.isArray`
- Nenhuma mudança de schema SQL nem de API contract
- Dados já persistidos no banco como string `"[]"` continuarão funcionando após o fix de leitura
