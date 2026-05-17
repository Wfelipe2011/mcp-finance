## MODIFIED Requirements

### Requirement: Worker de digest consome tabela `digest_jobs`
O sistema SHALL ter tabela `digest_jobs` com colunas: `id BIGSERIAL PK`, `tenant_id UUID NOT NULL REFERENCES tenants(id)`, `year INTEGER NOT NULL`, `month INTEGER NOT NULL`, `status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped'))`, `attempts INTEGER DEFAULT 0`, `worker_id UUID REFERENCES workers(id)`, `started_at TIMESTAMP`, `finished_at TIMESTAMP`, `error_msg TEXT`, `created_at TIMESTAMP DEFAULT NOW()`. Constraint UNIQUE em `(tenant_id, year, month)` para idempotencia de enqueue.

#### Scenario: Enqueue nao duplica job para mesmo tenant/mes
- **WHEN** `POST /api/admin/digest/enqueue` e chamado duas vezes para o mesmo tenant/mes
- **THEN** a segunda chamada e ignorada via ON CONFLICT DO NOTHING
- **THEN** o job existente nao e modificado

#### Scenario: Worker valida cobertura minima antes de gerar digest
- **WHEN** `digest_jobs` tem registro com `status='pending'` e a cobertura do tenant/mes e `>= 80%`
- **THEN** `nextDigestJob()` atualiza para `status='running'`, seta `worker_id` e `started_at`
- **THEN** o worker gera e persiste o digest e marca o job como `done`

#### Scenario: Worker marca skipped quando cobertura cai abaixo de 80%
- **WHEN** `digest_jobs` tem registro `pending` e a cobertura do tenant/mes e `< 80%` no momento do processamento
- **THEN** o worker marca o job como `skipped`
- **THEN** nenhum digest novo e persistido para aquele job

## ADDED Requirements

### Requirement: Worker compartilhado consome multiplas filas em loop unico
O processo de worker SHALL consumir filas de `enrich_jobs`, `digest_jobs` e `forecast_jobs` no mesmo loop de execucao, processando exatamente um job por iteracao por worker.

#### Scenario: Worker processa um unico job por vez
- **WHEN** um worker encontra jobs pendentes em mais de uma fila
- **THEN** ele claima e processa apenas um job na iteracao atual
- **THEN** somente apos concluir essa iteracao ele tenta claimar o proximo job

#### Scenario: Fila vazia nao bloqueia processamento das demais
- **WHEN** uma das filas monitoradas esta vazia
- **THEN** o worker segue tentando claimar nas outras filas habilitadas
