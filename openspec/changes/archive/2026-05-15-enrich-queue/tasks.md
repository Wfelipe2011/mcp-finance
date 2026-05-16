## 1. BunPgAdapter — Métodos de enrich_jobs

- [x] 1.1 Adicionar interface `EnrichJob` com campos: `id`, `tenant_id`, `transaction_id`, `date`, `status`, `attempts`, `worker_id`
- [x] 1.2 Implementar `enrich_jobs.enqueue(tenantId, transactionIds)` — bulk insert com `ON CONFLICT DO NOTHING`, excluindo transações que já têm `ai_transaction_insights`
- [x] 1.3 Implementar `enrich_jobs.nextJob(workerId)` — CTE com sorteio de tenant + `ORDER BY date DESC` + `FOR UPDATE SKIP LOCKED`, retorna job ou null
- [x] 1.4 Implementar `enrich_jobs.markDone(jobId, workerId)` — atualiza `status='done'`, `finished_at`, incrementa `workers.jobs_done`
- [x] 1.5 Implementar `enrich_jobs.markError(jobId, error)` — incrementa `attempts`; `status='error'` se `attempts >= 3`, senão `status='pending'`
- [x] 1.6 Implementar `enrich_jobs.releaseStuck()` — libera jobs `processing` com `started_at < NOW() - 10 min` para `pending`

## 2. Integração com Sync

- [x] 2.1 Atualizar `routes/sync.ts` — após conclusão do upsert de transações, chamar `db.enrich_jobs.enqueue(tenantId, transactionIds)`
- [x] 2.2 Verificar que o enqueue acontece dentro do mesmo `sql.begin()` do sync para garantir atomicidade
- [x] 2.3 Incluir contagem de jobs enfileirados na resposta do sync: `{ synced: N, enrich_queued: M }`

## 3. Worker Loop

- [x] 3.1 Criar `src/application/workers/enrich-worker.ts` que lê `WORKER_ID` do env
- [x] 3.2 Worker inicia instanciando `BunPgAdapter()` sem `tenantId` (acesso a `enrich_jobs` sem RLS)
- [x] 3.3 Implementar loop: `releaseStuck()` → `nextJob(workerId)` → se null aguarda 5s → se job: busca transação, chama `enrichTransaction(tx)`, chama `markDone` ou `markError`
- [x] 3.4 Worker instancia `BunPgAdapter(job.tenant_id)` para buscar a transação e salvar o resultado (com RLS do tenant)
- [x] 3.5 Worker loga `[worker:${WORKER_ID}] job=${jobId} tenant=${tenantId} tx=${transactionId}` ao iniciar cada job
- [x] 3.6 Worker loga `[worker:${WORKER_ID}] done job=${jobId} attempts=${attempts}` ao concluir

## 4. Remover Script CLI

- [x] 4.1 Remover `src/scripts/enrich.ts`
- [x] 4.2 Remover script `"enrich"` do `package.json`
- [x] 4.3 Adicionar script `"worker"` ao `package.json`: `"bun run src/application/workers/enrich-worker.ts"`

## 5. Verificação

- [x] 5.1 Testar que sync com 10 novas transações cria 10 jobs `pending` em `enrich_jobs`
- [x] 5.2 Testar que re-sync não duplica jobs (`ON CONFLICT DO NOTHING`)
- [x] 5.3 Testar que dois workers rodando em paralelo não pegam o mesmo job (`SKIP LOCKED`)
- [x] 5.4 Testar que jobs travados são liberados após 10 minutos
- [x] 5.5 Testar que após 3 falhas o job vai para `status='error'` permanente
- [x] 5.6 Testar que worker de tenant A não acessa dados de tenant B (RLS no upsertOne)
