## Purpose
Define monthly digest generation pipeline behavior and API contract.

## Requirements

### Requirement: Pipeline gera digest narrativo via worker que consome fila
O sistema SHALL processar o digest via `digest-worker.ts` (processo Bun gerenciado pelo supervisor), nao diretamente pelo cron. O worker SHALL buscar jobs da tabela `digest_jobs` usando `nextDigestJob()`, verificar coverage 100% como safety net, processar um job por vez chamando o modelo AI, e persistir o resultado em `ai_monthly_digest` via UPSERT, marcando o job como `done` via `markDigestDone()`.

#### Scenario: Worker processa job com coverage 100%
- **WHEN** ha um job `pending` em `digest_jobs` e o tenant tem 100% de enrich coverage para year/month
- **THEN** o worker gera o digest via AI e persiste em `ai_monthly_digest`, marcando o job como `done`

#### Scenario: Worker encontra job com coverage insuficiente (safety net)
- **WHEN** ha um job `pending` em `digest_jobs` mas o tenant nao tem mais 100% de coverage (coverage caiu desde o enqueue)
- **THEN** o worker marca o job como `skipped` e loga o motivo, sem gerar digest

#### Scenario: UPSERT permite re-execucao (idempotente)
- **WHEN** o worker processa um job para um mes que ja tem digest em `ai_monthly_digest`
- **THEN** a segunda execucao atualiza o registro existente (nao duplica)

#### Scenario: Worker sem jobs na fila dorme e retenta
- **WHEN** nao ha jobs `pending` em `digest_jobs`
- **THEN** o worker aguarda 10 segundos e tenta de novo

### Requirement: Metricas financeiras sao calculadas localmente, nao pelo modelo
O sistema SHALL calcular `cashflow_real`, `debt_inflows` e `debt_payments` a partir dos dados ja enriquecidos, sem delegar aritmetica ao LLM. O modelo SHALL receber as metricas prontas e focar apenas em analise qualitativa.

#### Scenario: cashflow_real exclui entradas de divida
- **WHEN** o digest de um mes com deposito de emprestimo e gerado
- **THEN** `cashflow_real` NAO inclui transacoes onde `is_debt_related = true` e `type = 'INCOME'`

#### Scenario: debt_inflows captura emprestimos recebidos
- **WHEN** o mes contem transacoes com `is_debt_related = true` e `type = 'INCOME'`
- **THEN** `debt_inflows` e a soma positiva dessas transacoes

### Requirement: GET /api/digest retorna status + dados ou pending
O sistema SHALL ter `GET /api/digest?month=YYYY-MM` que: (1) verifica cobertura de enrich do mes para o tenant corrente, (2) retorna `{ status: "pending", coverage: <0..1> }` se enrich incompleto, (3) retorna `{ status: "ready", data: { ... } }` se digest existe no banco.

#### Scenario: Digest gerado e disponivel
- **WHEN** `GET /api/digest?month=2026-05` e chamado e o digest do mes existe em `ai_monthly_digest`
- **THEN** retorna `{ status: "ready", data: { narrative_pt, cashflow_real, ... } }` em <100ms

#### Scenario: Enrich incompleto
- **WHEN** `GET /api/digest?month=2026-05` e chamado e apenas 60% das transacoes tem ai_insights
- **THEN** retorna `{ status: "pending", coverage: 0.6 }`

#### Scenario: Mes sem transacoes
- **WHEN** `GET /api/digest?month=2025-01` e chamado e nao ha transacoes para esse mes
- **THEN** retorna `{ status: "pending", coverage: 0 }`

### Requirement: Cron diario as 23:50 enfileira (nao processa) digest para tenants prontos
O sistema SHALL ter processo cron que roda diariamente as 23:50, itera por todos os tenants `active`, verifica se 100% das transacoes do mes corrente tem `ai_transaction_insights` e `total > 0`, e para os tenants que satisfazem essa condicao, insere job em `digest_jobs` via ON CONFLICT DO NOTHING.

#### Scenario: Tenant com 100% de enrich no mes
- **WHEN** o cron das 23:50 roda e o tenant A tem todas as transacoes de maio enriched
- **THEN** o cron insere job em `digest_jobs` para tenant A com `year`, `month`, `status='pending'`

#### Scenario: Tenant com enrich incompleto
- **WHEN** o cron das 23:50 roda e o tenant B ainda tem transacoes pendentes em `enrich_jobs`
- **THEN** o cron pula o tenant B sem erro

#### Scenario: Job ja existente nao e duplicado
- **WHEN** o cron insere job para um tenant/mes que ja tem job em `digest_jobs`
- **THEN** o ON CONFLICT DO NOTHING ignora silenciosamente
