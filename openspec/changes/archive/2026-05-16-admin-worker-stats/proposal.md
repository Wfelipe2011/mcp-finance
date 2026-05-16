## Why

O admin panel de workers exibe apenas status e contagem de erros, sem qualquer métrica de desempenho. Com 1500+ jobs processando, não há visibilidade de quão rápido cada worker está operando — impossível comparar os dois devices (S25 Plus vs S20 FE) ou detectar degradação de performance.

## What Changes

- `GET /api/admin/workers` retorna dois novos campos por worker: `avg_duration_secs` (média) e `median_duration_secs` (mediana) — calculados via LEFT JOIN sobre `enrich_jobs` done dos últimos 7 dias e de todos os tempos (two sub-aggregations)
- A tabela de workers no admin panel ganha duas colunas novas: **Média (7d)** e **Mediana (7d)**, com legenda explicando a diferença entre as duas métricas
- Auto-refresh da seção de workers a cada 30 segundos

## Capabilities

### New Capabilities
- `admin-worker-stats`: Exposição de métricas de performance (média e mediana de duração de job) por worker na API admin e no painel HTML

### Modified Capabilities
<!-- nenhuma alteração de requisitos em specs existentes -->

## Impact

- `src/infrastructure/db/BunPgAdapter.ts` — `workers.findAll()` recebe JOIN com `enrich_jobs`
- `src/application/web/routes/admin/workers.ts` — nenhuma mudança necessária (findAll já retorna o worker row)
- `src/application/web/routes/admin/panel.ts` — tabela HTML, renderWorkers(), legenda e auto-refresh
- Schema: nenhuma migração — colunas são calculadas on-the-fly via aggregate
