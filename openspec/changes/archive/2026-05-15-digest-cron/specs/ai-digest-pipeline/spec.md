## ADDED Requirements

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

### Requirement: Cron diário às 23:50 gera digest para tenants prontos
O sistema SHALL ter processo cron que roda diariamente às 23:50, itera por todos os tenants `active`, verifica se 100% das transações do mês corrente têm `ai_transaction_insights` e `total > 0`, e para os tenants que satisfazem essa condição, gera e persiste o digest via AI.

#### Scenario: Tenant com 100% de enrich no mês
- **WHEN** o cron das 23:50 roda e o tenant A tem todas as transações de maio enriched
- **THEN** o cron gera digest para tenant A e persiste em `ai_monthly_digest` com `year`, `month`, `tenant_id`

#### Scenario: Tenant com enrich incompleto
- **WHEN** o cron das 23:50 roda e o tenant B ainda tem transações pendentes em `enrich_jobs`
- **THEN** o cron pula o tenant B sem erro; tenta novamente no dia seguinte

#### Scenario: Digest já existe para o mês
- **WHEN** o cron roda e já existe digest para o mês em `ai_monthly_digest`
- **THEN** o cron faz UPSERT — atualiza com dados mais recentes (re-geração idempotente)

## MODIFIED Requirements

### Requirement: Pipeline gera digest narrativo de mês completo
O sistema SHALL processar o digest via cron diário (não via script CLI). O cron SHALL ler os registros de `ai_transaction_insights` do mês via `f_transacoes` com `SET LOCAL app.tenant_id`, calcular métricas localmente e invocar o modelo uma vez por tenant. O resultado SHALL ser persistido em `ai_monthly_digest` via UPSERT. O parâmetro `--month` e o script CLI são removidos.

#### Scenario: Digest gerado automaticamente pelo cron
- **WHEN** o cron das 23:50 detecta tenant com 100% de cobertura no mês corrente
- **THEN** gera digest com métricas e narrativa e persiste via UPSERT sem interação manual

#### Scenario: UPSERT permite re-execução (idempotente)
- **WHEN** o cron roda duas vezes consecutivas para o mesmo tenant/mês
- **THEN** a segunda execução atualiza o registro existente sem duplicar

## REMOVED Requirements

### Requirement: Script emite aviso quando enrichment_coverage é baixo
**Reason**: O cron não gera digest quando coverage < 100% — não há necessidade de aviso para o operador. O `GET /api/digest` retorna `{ status: "pending", coverage }` para o usuário final.
**Migration**: N/A — lógica de aviso não tem equivalente necessário no cron.

### Requirement: Parâmetro --month é obrigatório
**Reason**: O script CLI `bun run digest --month YYYY-MM` é descontinuado. O cron sempre processa o mês corrente.
**Migration**: Remover `src/scripts/digest.ts` e o script `digest` do `package.json`.
