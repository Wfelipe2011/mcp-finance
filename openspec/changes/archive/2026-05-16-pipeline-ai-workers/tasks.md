## 1. DB Schema

- [x] 1.1 Adicionar coluna `kind TEXT NOT NULL DEFAULT 'enrich' CHECK (kind IN ('enrich', 'digest', 'forecast'))` à tabela `workers` em `schema.sql`
- [x] 1.2 Criar tabela `digest_jobs` em `schema.sql` com constraint UNIQUE em `(tenant_id, year, month)`
- [x] 1.3 Criar tabela `forecast_jobs` em `schema.sql` com constraint UNIQUE em `(tenant_id, job_date)`
- [x] 1.4 Criar tabela `ml_training_jobs` em `schema.sql` (sem UNIQUE — re-treino é válido)
- [x] 1.5 Criar migration SQL para aplicar as mudanças em banco existente (ALTER TABLE workers ADD COLUMN kind + CREATE TABLE IF NOT EXISTS para as 3 novas tabelas)

## 2. BunPgAdapter — novos namespaces

- [x] 2.1 Adicionar campo `kind` ao tipo `WorkerRow` e query `findActive()` em `BunPgAdapter.ts`
- [x] 2.2 Criar namespace `digest_jobs` em `BunPgAdapter.ts` com métodos: `enqueue(tenants)`, `nextJob(workerId)`, `markDone(jobId)`, `markError(jobId, msg)`, `markSkipped(jobId)`, `releaseStuck()`, `getQueueStats()`
- [x] 2.3 Criar namespace `forecast_jobs` em `BunPgAdapter.ts` com métodos: `enqueue(tenants, date)`, `nextJob(workerId)`, `markDone(jobId)`, `markError(jobId, msg)`, `releaseStuck()`, `getQueueStats()`
- [x] 2.4 Criar método `ml_training_jobs.enqueue(tenants)`, `ml_training_jobs.nextJob()`, `ml_training_jobs.markDone(jobId, mae, mape)`, `ml_training_jobs.markError(jobId, msg)`, `ml_training_jobs.releaseStuck()`, `ml_training_jobs.getQueueStats()` em `BunPgAdapter.ts`

## 3. Workers TypeScript

- [x] 3.1 Criar `src/application/workers/digest-worker.ts` com loop: `nextDigestJob()` → verifica coverage 100% (safety net) → `generateDigest()` → `markDigestDone()` / `markDigestSkipped()` / `markDigestError()`, sleep 10s se fila vazia
- [x] 3.2 Criar `src/application/workers/forecast-worker.ts` com loop: `nextForecastJob()` → `generateForecastMessage()` → `saveDailyMessage()` → `markForecastDone()` / `markForecastError()`, sleep 10s se fila vazia

## 4. Supervisor

- [x] 4.1 Atualizar `spawnWorker()` em `supervisor.ts` para escolher o script correto com base em `worker.kind` (`enrich-worker.ts`, `digest-worker.ts` ou `forecast-worker.ts`)
- [x] 4.2 Garantir que `findActiveWorkers()` retorna o campo `kind` no SELECT

## 5. Crons — converter para auto-enqueue

- [x] 5.1 Refatorar `digest-cron.ts`: substituir `generateDigest()` + `upsertDigest()` por `db.digest_jobs.enqueue()` para tenants com 100% de coverage — manter agendamento 23:50
- [x] 5.2 Refatorar `forecast-cron.ts`: substituir `generateForecastMessage()` + `saveDailyMessage()` por `db.forecast_jobs.enqueue()` para todos os tenants ativos — manter agendamento 00:30 UTC

## 6. ML Trainer Python

- [x] 6.1 Substituir bloco `schedule` em `src/ml/trainer.py` por loop de polling: `nextTrainingJob()` → `train_all_tenants(tenant_id)` → `markTrainingDone(job_id, mae, mape)` / `markTrainingError(job_id, msg)`, sleep 60s se fila vazia
- [x] 6.2 Implementar funções `nextTrainingJob()`, `markTrainingDone()`, `markTrainingError()`, `releaseStuck()` em Python usando psycopg2 e `ML_DATABASE_URL`
- [x] 6.3 Adicionar auto-enqueue à inicialização do trainer: ao iniciar, inserir jobs para todos os tenants ativos (comportamento do antigo "run once on startup")

## 7. Admin API — endpoints

- [x] 7.1 Criar handler `handleDigestEnqueue(req, sql)` em `src/application/web/routes/admin/` — verifica coverage 100% por tenant, insere em `digest_jobs`
- [x] 7.2 Criar handler `handleDigestQueueStats(req, sql)` — retorna contagens por status em `digest_jobs`
- [x] 7.3 Criar handler `handleForecastEnqueue(req, sql)` — insere jobs em `forecast_jobs` para todos os tenants ativos com `job_date = hoje`
- [x] 7.4 Criar handler `handleForecastQueueStats(req, sql)` — retorna contagens por status em `forecast_jobs`
- [x] 7.5 Criar handler `handleMlEnqueue(req, sql)` — insere jobs em `ml_training_jobs` para todos os tenants ativos
- [x] 7.6 Criar handler `handleMlQueueStats(req, sql)` — retorna contagens por status em `ml_training_jobs`
- [x] 7.7 Registrar os 6 novos endpoints no `router.ts`: `POST/GET /api/admin/digest/...`, `POST/GET /api/admin/forecast/...`, `POST/GET /api/admin/ml/...`

## 8. Admin Panel UI

- [x] 8.1 Adicionar card "Digest Queue" ao HTML do `panel.ts` com stats grid (pending/running/done/error/skipped) e botão "Enqueue Digest"
- [x] 8.2 Adicionar card "Forecast Queue" ao HTML do `panel.ts` com stats grid e botão "Enqueue Forecast"
- [x] 8.3 Adicionar card "ML Training" ao HTML do `panel.ts` com stats grid e botão "Enqueue Training"
- [x] 8.4 Adicionar JavaScript no `panel.ts` para fetch dos 3 queue stats (polling 30s) e handlers dos 3 botões de enqueue com feedback visual

## 9. Workers no Banco — setup inicial

- [x] 9.1 Criar workers `kind='digest'` e `kind='forecast'` via admin panel ou SQL direto para que o supervisor os spawne

## 10. Validação

- [x] 10.1 Rodar `cd client && bun run build` para validar TypeScript
- [x] 10.2 Verificar que supervisor spawna `digest-worker.ts` e `forecast-worker.ts` ao iniciar com workers cadastrados
- [x] 10.3 Testar enqueue manual via admin panel e confirmar que workers consomem os jobs
- [x] 10.4 Verificar que crons ainda rodam no horário e inserem na fila (não processam diretamente)
