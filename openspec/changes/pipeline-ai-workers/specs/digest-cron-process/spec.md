## MODIFIED Requirements

### Requirement: Cron calcula cobertura por tenant com SET LOCAL
O cron SHALL, para cada tenant ativo, executar `SET LOCAL app.tenant_id = <uuid>` e então consultar a cobertura do mês: `COUNT(*)` de `f_transacoes` vs `COUNT(ai.transaction_id)` via LEFT JOIN com `ai_transaction_insights`. Somente se `enriched = total AND total > 0` o cron insere um job em `digest_jobs` para esse tenant — o cron **não gera o digest diretamente**.

#### Scenario: Query de cobertura retorna 100%
- **WHEN** `COUNT(*) = COUNT(ai.transaction_id)` e `total > 0` para o tenant/mês
- **THEN** o cron insere (ou ignora via ON CONFLICT) um registro em `digest_jobs` com `(tenant_id, year, month, status='pending')`

#### Scenario: Query de cobertura retorna parcial
- **WHEN** `COUNT(ai.transaction_id) < COUNT(*)` para o tenant/mês
- **THEN** o cron loga `[cron] tenant=<uuid> coverage=X/Y — skipped` e continua para o próximo tenant sem inserir job

### Requirement: Cron itera por tenants sem RLS global
O cron SHALL consultar `SELECT id FROM tenants WHERE status = 'active'` sem `SET LOCAL` (acesso direto à tabela `tenants`) e iterar por cada tenant aplicando `SET LOCAL` individualmente para cada uma das queries de cobertura.

#### Scenario: Múltiplos tenants ativos
- **WHEN** o cron roda e há 3 tenants ativos
- **THEN** o cron verifica coverage de cada tenant em sequência, inserindo jobs apenas para os que estão prontos

### Requirement: Cron agendado diariamente às 23:50 via setTimeout recursivo
O cron SHALL usar `setTimeout` recursivo (não `setInterval`) para calcular exatamente o delay até 23:50 do dia corrente (ou do dia seguinte se já passou). Sem dependência de bibliotecas externas de cron.

#### Scenario: Agendamento correto após execução
- **WHEN** o cron termina de rodar
- **THEN** re-agenda automaticamente para o próximo 23:50
