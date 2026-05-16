## Why

O worker de enrich de IA falha ao salvar os insights porque `upsertOne` usa `current_setting('app.tenant_id')` fora de uma transação ativa, lançando `unrecognized configuration parameter "app.tenant_id"`. Com isso, a fila de 1520 jobs fica em loop infinito de erro sem salvar nada na tabela `ai_transaction_insights`.

## What Changes

- Corrigir `aiInsights.upsertOne()` no `BunPgAdapter` para usar o `tid` do closure diretamente em vez de `current_setting('app.tenant_id')`
- Resetar os jobs com status `error` que falharam por este bug (para que sejam reprocessados)

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `enrich-queue`: O comportamento de salvamento de insights muda — o `tenant_id` é passado diretamente como parâmetro em vez de depender de configuração de sessão PostgreSQL

## Impact

- `src/infrastructure/db/BunPgAdapter.ts` — método `aiInsights.upsertOne()`
- Tabela `enrich_jobs` — reset de jobs com status `error` causados por este bug
- Tabela `ai_transaction_insights` — começa a ser populada corretamente após o fix
