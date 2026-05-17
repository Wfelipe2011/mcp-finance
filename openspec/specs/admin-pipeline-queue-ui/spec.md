## Purpose
Define admin queue cards and endpoints for digest, forecast, and ML enqueue operations.

## Requirements

### Requirement: Admin panel exibe card de Digest Queue com stats e enqueue manual
O super admin panel SHALL exibir uma secao "Digest Queue" com: stats em tempo real (pending, running, done, error), botao "Enqueue Digest" que chama `POST /api/admin/digest/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs apenas para tenants com cobertura de enriquecimento maior ou igual a 80% no mes corrente.

#### Scenario: Admin clica em Enqueue Digest com tenants prontos
- **WHEN** o admin clica em "Enqueue Digest" e ha tenants com cobertura >= 80%
- **THEN** sao inseridos jobs em `digest_jobs` para esses tenants
- **THEN** o card de stats atualiza mostrando os novos pending

#### Scenario: Admin clica em Enqueue Digest sem tenants prontos
- **WHEN** o admin clica em "Enqueue Digest" e nenhum tenant tem cobertura >= 80%
- **THEN** nenhum job e inserido
- **THEN** o painel exibe mensagem informativa explicita de elegibilidade zero

### Requirement: Admin panel exibe card de Forecast Queue com stats e enqueue manual
O super admin panel SHALL exibir uma secao "Forecast Queue" com: stats em tempo real (pending, running, done, error), botao "Enqueue Forecast" que chama `POST /api/admin/forecast/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs para todos os tenants ativos com `job_date = hoje`.

#### Scenario: Admin clica em Enqueue Forecast
- **WHEN** o admin clica em "Enqueue Forecast"
- **THEN** sao inseridos jobs em `forecast_jobs` para todos os tenants `active` com a data atual
- **THEN** o card de stats atualiza mostrando os novos pending

### Requirement: Admin panel exibe card de ML Training com stats e enqueue manual
O super admin panel SHALL exibir uma secao "ML Training" com: stats em tempo real (pending, running, done, error), botao "Enqueue Training" que chama `POST /api/admin/ml/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs para todos os tenants ativos.

#### Scenario: Admin clica em Enqueue Training
- **WHEN** o admin clica em "Enqueue Training"
- **THEN** sao inseridos jobs em `ml_training_jobs` para todos os tenants `active`
- **THEN** o card de stats atualiza mostrando os novos pending

### Requirement: Endpoints de admin para enqueue e stats de digest, forecast e ML
O sistema SHALL ter os seguintes endpoints (todos requerem super admin auth):
- `POST /api/admin/digest/enqueue` - enfileira digest para tenants com cobertura >= 80% no mes corrente
- `GET /api/admin/digest/queue-stats` - retorna contagem por status em `digest_jobs`
- `POST /api/admin/forecast/enqueue` - enfileira forecast para todos os tenants ativos (data=hoje)
- `GET /api/admin/forecast/queue-stats` - retorna contagem por status em `forecast_jobs`
- `POST /api/admin/ml/enqueue` - enfileira treino ML para todos os tenants ativos
- `GET /api/admin/ml/queue-stats` - retorna contagem por status em `ml_training_jobs`

#### Scenario: POST /api/admin/digest/enqueue retorna elegibilidade aplicada
- **WHEN** `POST /api/admin/digest/enqueue` e chamado com token de super admin
- **THEN** retorna payload com `enqueued`, `eligible`, `year` e `month`
- **THEN** `eligible` considera apenas tenants com cobertura >= 80%

#### Scenario: GET /api/admin/digest/queue-stats retorna contagens
- **WHEN** `GET /api/admin/digest/queue-stats` e chamado com token de super admin
- **THEN** retorna `{ pending: N, running: N, done: N, error: N, skipped: N }` com totais de `digest_jobs`

#### Scenario: POST /api/admin/ml/enqueue sem super admin e rejeitado
- **WHEN** `POST /api/admin/ml/enqueue` e chamado sem token de super admin
- **THEN** retorna 403 Forbidden
