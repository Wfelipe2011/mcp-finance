## Why

O enrich hoje é um script CLI (`bun run enrich --limit N`) que processa um lote fixo de transações sequencialmente. Não existe mecanismo de fila, não há paralelismo, e o script não sabe de múltiplos tenants. Para o MVP multi-tenant, o enrich precisa acontecer automaticamente após cada sync, ser distribuído entre N workers (modelos AI) e garantir que um tenant com muitas transações não bloqueie outros.

## What Changes

- O script `src/scripts/enrich.ts` é **descontinuado** — substituído pelo worker loop
- `POST /api/sync` passa a popular `enrich_jobs` para cada transação sem `ai_insight`, na mesma transação do sync (padrão Transactional Outbox)
- Jobs são inseridos com `ON CONFLICT (transaction_id) DO NOTHING` — dedup automático
- Workers Bun (processos filhos gerenciados pelo supervisor) fazem poll da tabela `enrich_jobs`
- A query de next-job usa sorteio aleatório de tenant + `ORDER BY date DESC` + `FOR UPDATE SKIP LOCKED`
- Workers atualizam `enrich_jobs.status`, `worker_id`, `started_at`, `finished_at`, `error_count`
- Jobs travados (processing > 10 min sem atualização) são liberados de volta para `pending`
- O script `bun run enrich` é removido do `package.json`

## Capabilities

### New Capabilities

- `sync-enqueue`: Lógica de enfileiramento de `enrich_jobs` integrada ao sync, na mesma transação
- `worker-loop`: Loop de poll do worker — busca job, processa, marca done/error
- `stuck-job-recovery`: Mecanismo de liberação automática de jobs travados (processing > 10 min)

### Modified Capabilities

- `ai-enrich-pipeline`: O pipeline de enrich deixa de ser um script CLI e passa a ser executado por workers em background

## Impact

- `src/application/web/routes/sync.ts` — adiciona enfileiramento de `enrich_jobs` após upsert de transações
- `src/infrastructure/db/BunPgAdapter.ts` — novos métodos para `enrich_jobs`: `enqueue`, `nextJob`, `markDone`, `markError`, `releaseStuck`
- `src/application/workers/enrich-worker.ts` — novo arquivo: loop de poll do worker
- `src/scripts/enrich.ts` — removido
- `package.json` — remove script `enrich`, adiciona script `worker` para rodar o worker loop
