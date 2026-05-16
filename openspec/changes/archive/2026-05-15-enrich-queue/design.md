## Context

O `BunPgAdapter` já tem `sql.begin()` para todas as escritas. O sync já faz upsert de transações em `sql.begin()`. A tabela `enrich_jobs` foi criada no change `multitenant-schema`. O modelo AI é instanciado via `model.ts` que lê `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` do env.

## Goals / Non-Goals

**Goals:**
- Enfileirar jobs no mesmo `sql.begin()` do sync (atomicidade — se sync falha, nenhum job fica órfão)
- Worker loop simples: poll → processa → atualiza
- Anti-monopolização de tenant via sorteio
- Recuperação de jobs travados
- Integração com `workers` table para tracking de `jobs_done`

**Non-Goals:**
- WebSocket ou NOTIFY para acordar workers (poll simples é suficiente para MVP)
- Fila de prioridade por tenant (sorteio aleatório é suficiente)
- Retry com backoff exponencial (attempts++ com limite é suficiente)
- Dead letter queue

## Decisions

### D1: Transactional Outbox — enqueue no mesmo sql.begin do sync

O sync insere transações e já enfileira os jobs de enrich na mesma transação PostgreSQL. Se o sync falhar a qualquer ponto, nenhum job fica na fila sem a transação correspondente.

```sql
-- No sql.begin() do sync, após INSERT INTO transactions:
INSERT INTO enrich_jobs (tenant_id, transaction_id, date)
SELECT tenant_id, id, date::date
FROM transactions
WHERE tenant_id = current_setting('app.tenant_id')::UUID
  AND NOT EXISTS (
    SELECT 1 FROM ai_transaction_insights ai WHERE ai.transaction_id = transactions.id
  )
ON CONFLICT (transaction_id) DO NOTHING;
```

### D2: Next-job com sorteio de tenant + SKIP LOCKED

```sql
WITH rnd_tenant AS (
  SELECT DISTINCT tenant_id FROM enrich_jobs
  WHERE status = 'pending'
  ORDER BY RANDOM() LIMIT 1
),
next AS (
  SELECT id, transaction_id, tenant_id, date
  FROM enrich_jobs
  WHERE status = 'pending'
    AND tenant_id = (SELECT tenant_id FROM rnd_tenant)
  ORDER BY date DESC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE enrich_jobs SET
  status = 'processing',
  worker_id = $workerId,
  started_at = NOW(),
  attempts = attempts + 1
FROM next
WHERE enrich_jobs.id = next.id
RETURNING *;
```

**Rationale**: `SKIP LOCKED` previne bloqueio entre workers. Sorteio de tenant garante fairness. `ORDER BY date DESC` processa transações mais recentes primeiro dentro de cada tenant.

### D3: Poll interval de 5 segundos quando fila vazia

Quando `nextJob()` retorna null (fila vazia), o worker aguarda 5 segundos e tenta de novo. Sem WebSocket ou NOTIFY — poll simples é confiável e fácil de debugar.

### D4: Stuck job recovery — a cada poll do worker

Antes de buscar o próximo job, o worker executa:

```sql
UPDATE enrich_jobs
SET status = 'pending', started_at = NULL, worker_id = NULL
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
```

**Rationale**: Simples e sem processo separado. Qualquer worker ativo libera jobs travados de outros workers mortos.

### D5: Limite de tentativas — 3 antes de marcar como error permanente

Se `attempts >= 3` ao marcar como erro, o job vai para `status = 'error'` permanente e não volta para `pending`. Isso previne loops infinitos em transações que a AI não consegue processar.

## Risks / Trade-offs

- **Poll a cada 5s por N workers** → N workers fazem N queries a cada 5s. Com 10 workers, são 120 queries/min — PostgreSQL suporta facilmente. Mitigation: aceito no MVP.
- **stuck_job_recovery por todos os workers** → pode haver múltiplos workers tentando liberar o mesmo job travado simultaneamente. Mitigation: `UPDATE ... WHERE status = 'processing'` é idempotente.
- **Job com `transaction_id` deletado** → se uma transação for deletada do banco, o job ficará em `pending` para sempre. Mitigation: FK `transaction_id` pode ser adicionada futuramente; no MVP, jobs órfãos são inofensivos.

## Migration Plan

1. Implementar métodos de `enrich_jobs` no `BunPgAdapter`
2. Atualizar `routes/sync.ts` para enfileirar após upsert
3. Criar `src/application/workers/enrich-worker.ts`
4. Remover `src/scripts/enrich.ts`
5. Atualizar `package.json`

## Open Questions

- *(Resolvido)* Sem BullMQ — PostgreSQL como fila nativa ✓
- *(Resolvido)* Ordering: mais recente primeiro por tenant ✓
- *(Resolvido)* Anti-monopolização: sorteio aleatório de tenant ✓
