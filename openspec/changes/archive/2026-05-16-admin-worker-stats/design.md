## Context

A tabela `workers` armazena metadados de cada worker (nome, URL, status, jobs_done). A tabela `enrich_jobs` tem `worker_id`, `started_at`, `finished_at` e `status`. A diferença `finished_at - started_at` representa a duração real do processamento de cada job por aquele worker.

O endpoint `GET /api/admin/workers` chama `db.workers.findAll()` que hoje faz `SELECT * FROM workers`. O admin panel renderiza a resposta diretamente em `renderWorkers()`.

## Goals / Non-Goals

**Goals:**
- Expor média e mediana de duração de job (em segundos) por worker, para duas janelas: últimos 7 dias e todos os jobs históricos
- Mostrar ambas as métricas na UI com legenda explicando a diferença
- Auto-refresh da tabela de workers a cada 30 segundos

**Non-Goals:**
- Percentis adicionais (P95, P99)
- Histograma de distribuição
- Comparação direta entre workers na UI (além da tabela)
- Nova rota ou endpoint separado

## Decisions

**Decisão: enriquecer `findAll()` com LEFT JOIN + aggregates**

```sql
SELECT
  w.*,
  -- Últimos 7 dias
  AVG(EXTRACT(EPOCH FROM (j7.finished_at - j7.started_at))) AS avg_duration_7d_secs,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (j7.finished_at - j7.started_at))
  ) AS median_duration_7d_secs,
  -- Todos os tempos
  AVG(EXTRACT(EPOCH FROM (jall.finished_at - jall.started_at))) AS avg_duration_all_secs,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (jall.finished_at - jall.started_at))
  ) AS median_duration_all_secs
FROM workers w
LEFT JOIN enrich_jobs j7
  ON j7.worker_id = w.id
  AND j7.status = 'done'
  AND j7.finished_at IS NOT NULL
  AND j7.started_at IS NOT NULL
  AND j7.finished_at >= NOW() - INTERVAL '7 days'
LEFT JOIN enrich_jobs jall
  ON jall.worker_id = w.id
  AND jall.status = 'done'
  AND jall.finished_at IS NOT NULL
  AND jall.started_at IS NOT NULL
GROUP BY w.id
```

Alternativas descartadas:
- **Endpoint separado**: mais código, 2 fetches no client, sem vantagem real
- **Coluna denormalizada**: requer migração + só suporta média incremental (mediana real exige todos os valores)

**Decisão: UI mostra média + mediana com legenda fixa**

A legenda fica abaixo da tabela, sempre visível (não tooltip), para garantir que o usuário entenda a diferença sem precisar hover.

**Decisão: auto-refresh via `setInterval(loadWorkers, 30_000)`**

Apenas a seção de workers é refreshada — tenants não precisa. O intervalo começa após `loadAll()` inicial.

**Decisão: formato "3,2s" para valores, "—" para null**

Workers que nunca processaram um job retornam `null` nos aggregates — a UI exibe "—".

## Risks / Trade-offs

- [Risk] JOIN duplo sobre `enrich_jobs` (que terá milhares de linhas) pode ficar lento → Mitigação: `enrich_jobs` já tem índice em `worker_id` implícito via FK; com 7 dias de janela o subconjunto é pequeno. Aceitável para admin panel (não é rota crítica de usuário).
- [Risk] `started_at` pode ser NULL para jobs que nunca começaram → Filtro `IS NOT NULL` resolve.
