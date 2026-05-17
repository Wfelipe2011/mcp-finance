## MODIFIED Requirements

### Requirement: Cron calcula cobertura por tenant com SET LOCAL
O cron SHALL, para cada tenant ativo, executar `SET LOCAL app.tenant_id = <uuid>` e entao consultar a cobertura do mes: `COUNT(*)` de `f_transacoes` vs `COUNT(ai.transaction_id)` via LEFT JOIN com `ai_transaction_insights`. Somente se `total > 0` e `COUNT(ai.transaction_id) / COUNT(*) >= 0.80` o cron insere um job em `digest_jobs` para esse tenant - o cron nao gera o digest diretamente.

#### Scenario: Query de cobertura retorna elegibilidade >= 80%
- **WHEN** a cobertura do tenant/mes e `>= 0.80` e `total > 0`
- **THEN** o cron insere (ou ignora via ON CONFLICT) um registro em `digest_jobs` com `(tenant_id, year, month, status='pending')`

#### Scenario: Query de cobertura retorna abaixo de 80%
- **WHEN** a cobertura do tenant/mes e `< 0.80`
- **THEN** o cron loga tenant e cobertura calculada como skipped
- **THEN** o cron continua para o proximo tenant sem inserir job

### Requirement: Cron itera por tenants sem RLS global
O cron SHALL consultar `SELECT id FROM tenants WHERE status = 'active'` sem `SET LOCAL` (acesso direto a tabela `tenants`) e iterar por cada tenant aplicando `SET LOCAL` individualmente para cada uma das queries de cobertura.

#### Scenario: Multiplos tenants ativos
- **WHEN** o cron roda e ha 3 tenants ativos
- **THEN** o cron verifica coverage de cada tenant em sequencia, inserindo jobs apenas para os que estao prontos

### Requirement: Cron agendado diariamente as 23:50 via setTimeout recursivo
O cron SHALL usar `setTimeout` recursivo (nao `setInterval`) para calcular exatamente o delay ate 23:50 do dia corrente (ou do dia seguinte se ja passou). Sem dependencia de bibliotecas externas de cron.

#### Scenario: Agendamento correto apos execucao
- **WHEN** o cron termina de rodar
- **THEN** re-agenda automaticamente para o proximo 23:50
