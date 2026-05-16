## ADDED Requirements

### Requirement: Admin panel exibe card de Digest Queue com stats e enqueue manual
O super admin panel SHALL exibir uma seção "Digest Queue" com: stats em tempo real (pending, running, done, error), botão "Enqueue Digest" que chama `POST /api/admin/digest/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs apenas para tenants com 100% de coverage no mês corrente.

#### Scenario: Admin clica em Enqueue Digest com tenants prontos
- **WHEN** o admin clica em "Enqueue Digest" e há tenants com 100% de coverage
- **THEN** são inseridos jobs em `digest_jobs` para esses tenants
- **THEN** o card de stats atualiza mostrando os novos pending

#### Scenario: Admin clica em Enqueue Digest sem tenants prontos
- **WHEN** o admin clica em "Enqueue Digest" e nenhum tenant tem 100% de coverage
- **THEN** nenhum job é inserido e o painel exibe mensagem informativa

### Requirement: Admin panel exibe card de Forecast Queue com stats e enqueue manual
O super admin panel SHALL exibir uma seção "Forecast Queue" com: stats em tempo real (pending, running, done, error), botão "Enqueue Forecast" que chama `POST /api/admin/forecast/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs para todos os tenants ativos com `job_date = hoje`.

#### Scenario: Admin clica em Enqueue Forecast
- **WHEN** o admin clica em "Enqueue Forecast"
- **THEN** são inseridos jobs em `forecast_jobs` para todos os tenants `active` com a data atual
- **THEN** o card de stats atualiza mostrando os novos pending

### Requirement: Admin panel exibe card de ML Training com stats e enqueue manual
O super admin panel SHALL exibir uma seção "ML Training" com: stats em tempo real (pending, running, done, error), botão "Enqueue Training" que chama `POST /api/admin/ml/enqueue`, e feedback de sucesso/erro. O enqueue insere jobs para todos os tenants ativos.

#### Scenario: Admin clica em Enqueue Training
- **WHEN** o admin clica em "Enqueue Training"
- **THEN** são inseridos jobs em `ml_training_jobs` para todos os tenants `active`
- **THEN** o card de stats atualiza mostrando os novos pending

### Requirement: Endpoints de admin para enqueue e stats de digest, forecast e ML
O sistema SHALL ter os seguintes endpoints (todos requerem super admin auth):
- `POST /api/admin/digest/enqueue` — enfileira digest para tenants com 100% coverage
- `GET /api/admin/digest/queue-stats` — retorna contagem por status em `digest_jobs`
- `POST /api/admin/forecast/enqueue` — enfileira forecast para todos os tenants ativos (data=hoje)
- `GET /api/admin/forecast/queue-stats` — retorna contagem por status em `forecast_jobs`
- `POST /api/admin/ml/enqueue` — enfileira treino ML para todos os tenants ativos
- `GET /api/admin/ml/queue-stats` — retorna contagem por status em `ml_training_jobs`

#### Scenario: GET /api/admin/digest/queue-stats retorna contagens
- **WHEN** `GET /api/admin/digest/queue-stats` é chamado com token de super admin
- **THEN** retorna `{ pending: N, running: N, done: N, error: N, skipped: N }` com totais de `digest_jobs`

#### Scenario: POST /api/admin/ml/enqueue sem super admin é rejeitado
- **WHEN** `POST /api/admin/ml/enqueue` é chamado sem token de super admin
- **THEN** retorna 403 Forbidden
