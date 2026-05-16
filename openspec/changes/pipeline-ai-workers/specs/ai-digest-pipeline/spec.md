## MODIFIED Requirements

### Requirement: Pipeline gera digest narrativo via worker que consome fila
O sistema SHALL processar o digest via `digest-worker.ts` (processo Bun gerenciado pelo supervisor), não diretamente pelo cron. O worker SHALL buscar jobs da tabela `digest_jobs` usando `nextDigestJob()`, verificar coverage 100% como safety net, processar um job por vez chamando o modelo AI, e persistir o resultado em `ai_monthly_digest` via UPSERT, marcando o job como `done` via `markDigestDone()`.

#### Scenario: Worker processa job com coverage 100%
- **WHEN** há um job `pending` em `digest_jobs` e o tenant tem 100% de enrich coverage para year/month
- **THEN** o worker gera o digest via AI e persiste em `ai_monthly_digest`, marcando o job como `done`

#### Scenario: Worker encontra job com coverage insuficiente (safety net)
- **WHEN** há um job `pending` em `digest_jobs` mas o tenant não tem mais 100% de coverage (coverage caiu desde o enqueue)
- **THEN** o worker marca o job como `skipped` e loga o motivo, sem gerar digest

#### Scenario: UPSERT permite re-execução (idempotente)
- **WHEN** o worker processa um job para um mês que já tem digest em `ai_monthly_digest`
- **THEN** a segunda execução atualiza o registro existente (não duplica)

#### Scenario: Worker sem jobs na fila dorme e retenta
- **WHEN** não há jobs `pending` em `digest_jobs`
- **THEN** o worker aguarda 10 segundos e tenta de novo

### Requirement: GET /api/digest retorna status + dados ou pending
O sistema SHALL ter `GET /api/digest?month=YYYY-MM` que: (1) verifica cobertura de enrich do mês para o tenant corrente, (2) retorna `{ status: "pending", coverage: <0..1> }` se enrich incompleto, (3) retorna `{ status: "ready", data: { ... } }` se digest existe no banco.

#### Scenario: Digest gerado e disponível
- **WHEN** `GET /api/digest?month=2026-05` é chamado e o digest do mês existe em `ai_monthly_digest`
- **THEN** retorna `{ status: "ready", data: { narrative_pt, cashflow_real, ... } }` em <100ms

#### Scenario: Enrich incompleto
- **WHEN** `GET /api/digest?month=2026-05` é chamado e apenas 60% das transações têm ai_insights
- **THEN** retorna `{ status: "pending", coverage: 0.6 }`

#### Scenario: Mês sem transações
- **WHEN** `GET /api/digest?month=2025-01` é chamado e não há transações para esse mês
- **THEN** retorna `{ status: "pending", coverage: 0 }`

### Requirement: Cron diário às 23:50 enfileira (não processa) digest para tenants prontos
O sistema SHALL ter processo cron que roda diariamente às 23:50, itera por todos os tenants `active`, verifica se 100% das transações do mês corrente têm `ai_transaction_insights` e `total > 0`, e para os tenants que satisfazem essa condição, insere job em `digest_jobs` via ON CONFLICT DO NOTHING.

#### Scenario: Tenant com 100% de enrich no mês
- **WHEN** o cron das 23:50 roda e o tenant A tem todas as transações de maio enriched
- **THEN** o cron insere job em `digest_jobs` para tenant A com `year`, `month`, `status='pending'`

#### Scenario: Tenant com enrich incompleto
- **WHEN** o cron das 23:50 roda e o tenant B ainda tem transações pendentes em `enrich_jobs`
- **THEN** o cron pula o tenant B sem erro

#### Scenario: Job já existente não é duplicado
- **WHEN** o cron insere job para um tenant/mês que já tem job em `digest_jobs`
- **THEN** o ON CONFLICT DO NOTHING ignora silenciosamente
