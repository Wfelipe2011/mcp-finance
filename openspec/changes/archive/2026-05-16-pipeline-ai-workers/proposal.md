## Why

Os processos de digest, forecast e ML training hoje rodam como crons independentes sem visibilidade, controle manual ou fila persistente. Queremos unificar digest, forecast e ML training na mesma arquitetura de filas do enrich — com supervisor gerenciando workers via banco e admin panel como trigger manual, além de manter o agendamento automático como auto-enqueue.

## What Changes

- Adiciona coluna `kind` na tabela `workers` (`'enrich' | 'digest' | 'forecast'`) para o supervisor spawnar o processo correto por tipo
- Cria tabelas de fila `digest_jobs` e `forecast_jobs` no banco (espelhando `enrich_jobs`)
- Cria tabela `ml_training_jobs` para enfileirar treinamentos do ML trainer Python
- Cria workers TypeScript `digest-worker.ts` e `forecast-worker.ts` com loop idêntico ao enrich
- Converte `digest-cron.ts` e `forecast-cron.ts` de "processamento direto" para "auto-enqueue" (inserem na fila, não processam)
- Modifica `ml/trainer.py` de scheduler direto para loop que consome `ml_training_jobs`
- Adiciona ao Admin Panel 3 novos cards: Digest Queue, Forecast Queue e ML Training Queue, cada um com stats e botão de enqueue manual
- Adiciona endpoints de API: `POST /api/admin/digest/enqueue`, `POST /api/admin/forecast/enqueue`, `POST /api/admin/ml/enqueue`, e respectivos `GET .../queue-stats`

## Capabilities

### New Capabilities

- `digest-worker`: Worker TypeScript que consome `digest_jobs`, verifica coverage 100% de enrich e gera digest via AI
- `forecast-worker`: Worker TypeScript que consome `forecast_jobs` e gera mensagem diária de forecast via AI
- `ml-training-queue`: Fila `ml_training_jobs` consumida pelo `ml/trainer.py`, com enqueue via admin ou cron automático
- `admin-pipeline-queue-ui`: Cards de queue stats e botões de enqueue manual no super admin panel para digest, forecast e ML

### Modified Capabilities

- `ai-enrich-pipeline`: A tabela `workers` recebe coluna `kind`; supervisor estende lógica para spawnar workers por tipo
- `digest-cron-process`: O cron deixa de processar diretamente e passa a inserir em `digest_jobs` (auto-enqueue)
- `ai-digest-pipeline`: Lógica de geração de digest migra do cron para o `digest-worker.ts`

## Impact

- **DB schema**: Novas tabelas `digest_jobs`, `forecast_jobs`, `ml_training_jobs`; coluna `kind` em `workers`
- **Supervisor**: Estende lógica de spawn para escolher script por `kind`
- **ML trainer**: Loop em Python substitui o scheduler `schedule`
- **Admin panel**: 3 novos cards de queue na UI HTML do `/admin`
- **Router**: Novos endpoints admin para enqueue e stats de digest/forecast/ml
- **BunPgAdapter**: Novos namespaces `digest_jobs`, `forecast_jobs` com mesma API do `enrich_jobs`
