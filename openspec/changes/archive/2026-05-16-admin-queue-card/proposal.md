## Why

O admin panel exibe a tabela de workers mas não dá nenhuma visibilidade sobre o estado geral da fila de enrich: quantas tarefas estão pendentes, qual a taxa de erro, e principalmente — quanto tempo vai levar para processar tudo com os workers ativos rodando 24/7. Essa informação é essencial para monitorar o progresso do pipeline de IA.

## What Changes

- Novo endpoint `GET /api/admin/queue-stats` que retorna contagens de `enrich_jobs` por status e métricas de erro (pontual e histórica)
- O endpoint também retorna `throughput_combined_jobs_per_sec` calculado a partir das medianas de todos os workers ativos — ou estimativa global (mediana de todos os jobs done) quando workers ainda não têm histórico
- Card "Caixa de Trabalhos" adicionado na seção de workers do admin panel (logo acima da tabela), exibindo: pendentes, em execução, concluídos, erro pontual, taxa de erro histórica e previsão de conclusão (ETA)
- Auto-refresh do card a cada 30 segundos (em sincronia com o auto-refresh de workers da change `admin-worker-stats`)

## Capabilities

### New Capabilities
- `admin-queue-card`: Card de visibilidade da fila de enrich no admin panel com contagens, taxas de erro e ETA calculado a partir do throughput combinado dos workers

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/infrastructure/db/BunPgAdapter.ts` — novo método `enrich_jobs.getQueueStats()` retornando contagens + throughput
- `src/application/web/routes/admin/workers.ts` — novo handler `handleQueueStats`
- `src/application/web/router.ts` — nova rota `GET /api/admin/queue-stats`
- `src/application/web/routes/admin/panel.ts` — card HTML + lógica JS de ETA e auto-refresh
