## Context

A tabela `enrich_jobs` tem colunas `status` ('pending', 'running', 'done', 'error'), `attempts`, `started_at`, `finished_at`, `worker_id`. A tabela `workers` tem `status` e, após a change `admin-worker-stats`, vai ter os aggregates de duração por worker no response do `findAll()`.

A fila tem ~1500 jobs pendentes com 2 workers ativos. O card precisa mostrar visibilidade operacional ao admin sem poluir os dados de performance por worker.

## Goals / Non-Goals

**Goals:**
- Expor contagens de `enrich_jobs` por status (pending, running, done, error)
- Calcular taxa de erro em dois modos:
  - **Pontual**: `COUNT(status='error') / COUNT(*)` — jobs travados agora em estado de erro
  - **Histórica**: `COUNT(attempts >= 3 AND (status='error' OR status='done' with error))` — melhor aproximado por `COUNT(error) / COUNT(done + error)`
- Calcular throughput combinado somando `1/mediana_secs` de cada worker ativo com histórico; fallback para mediana global de todos os jobs done quando não há histórico por worker
- Calcular ETA: `jobs_pending / throughput_combined`
- Exibir card na seção de workers (acima da tabela), auto-refresh a cada 30s

**Non-Goals:**
- Histórico temporal (gráfico de progresso ao longo do tempo)
- Estimativa por tenant
- Alertas ou notificações

## Decisions

**Decisão: endpoint separado `GET /api/admin/queue-stats`**

O `GET /api/admin/workers` já está sendo enriquecido pela change `admin-worker-stats`. Adicionar queue stats ali criaria um shape de resposta heterogêneo. Um endpoint dedicado é mais limpo e permite o card fazer refresh independente se necessário.

Response shape:
```json
{
  "pending": 1487,
  "running": 8,
  "done": 45,
  "error": 12,
  "total": 1552,
  "error_rate_current": 0.0077,
  "error_rate_historical": 0.21,
  "throughput_jobs_per_sec": 0.533,
  "eta_seconds": 2791,
  "throughput_source": "workers"
}
```

`throughput_source`: `"workers"` quando calculado de medianas individuais, `"global"` quando usa fallback de mediana global, `"unavailable"` quando não há dados.

**Decisão: cálculo do throughput combinado**

```sql
-- Mediana global (fallback)
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
  ORDER BY EXTRACT(EPOCH FROM (finished_at - started_at))
) AS global_median_secs
FROM enrich_jobs
WHERE status = 'done'
  AND finished_at IS NOT NULL AND started_at IS NOT NULL

-- Por worker (preferred) — já vem do admin-worker-stats, mas recalculamos aqui independentemente
SELECT
  w.id,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (j.finished_at - j.started_at))
  ) AS median_secs
FROM workers w
JOIN enrich_jobs j ON j.worker_id = w.id
  AND j.status = 'done'
  AND j.finished_at IS NOT NULL AND j.started_at IS NOT NULL
WHERE w.status IN ('idle', 'busy', 'active')
GROUP BY w.id
HAVING COUNT(j.id) > 0
```

Throughput combinado = Σ (1 / median_secs) para cada worker com histórico.

Se nenhum worker tem histórico → usa mediana global → `throughput = N_workers_active / global_median`.

**Decisão: taxas de erro**

- **Pontual**: `error_count / total` onde `total = pending + running + done + error`
- **Histórica**: `error_count / (done + error)` — proporção dos jobs que chegaram ao fim e falharam definitivamente

**Decisão: display do ETA**

```
ETA = null / throughput=0   → "—"
ETA < 60s                   → "menos de 1 minuto"
ETA < 3600s                 → "23 min"
ETA < 86400s                → "4h 23min"
ETA >= 86400s               → "2 dias 3h"
```

**Decisão: card fica acima da tabela de workers**

O card mostra o estado global da fila; a tabela mostra o detalhe por worker. Ordem natural: visão geral → detalhe.

## Risks / Trade-offs

- [Risk] Se `admin-worker-stats` não foi implementado ainda, o card funciona normalmente usando o fallback global — as duas changes são independentes em runtime
- [Risk] O JOIN sobre `enrich_jobs` para calcular mediana global pode ser lento com >100k jobs → Mitigação: janela de 7 dias também pode ser aplicada ao fallback global; a rota de admin não é crítica de performance
