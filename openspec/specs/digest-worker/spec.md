## Purpose
Define queue tables and worker behavior for digest, forecast, and ML training jobs.

## Requirements

### Requirement: Worker de digest consome tabela `digest_jobs`
O sistema SHALL ter tabela `digest_jobs` com colunas: `id BIGSERIAL PK`, `tenant_id UUID NOT NULL REFERENCES tenants(id)`, `year INTEGER NOT NULL`, `month INTEGER NOT NULL`, `status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped'))`, `attempts INTEGER DEFAULT 0`, `worker_id UUID REFERENCES workers(id)`, `started_at TIMESTAMP`, `finished_at TIMESTAMP`, `error_msg TEXT`, `created_at TIMESTAMP DEFAULT NOW()`. Constraint UNIQUE em `(tenant_id, year, month)` para idempotencia de enqueue.

#### Scenario: Enqueue nao duplica job para mesmo tenant/mes
- **WHEN** `POST /api/admin/digest/enqueue` e chamado duas vezes para o mesmo tenant/mes
- **THEN** a segunda chamada e ignorada via ON CONFLICT DO NOTHING
- **THEN** o job existente nao e modificado

#### Scenario: Worker pega proximo job disponivel
- **WHEN** `digest_jobs` tem registro com `status='pending'`
- **THEN** `nextDigestJob()` atualiza para `status='running'`, seta `worker_id` e `started_at`, e retorna o job

### Requirement: Worker de forecast consome tabela `forecast_jobs`
O sistema SHALL ter tabela `forecast_jobs` com colunas: `id BIGSERIAL PK`, `tenant_id UUID NOT NULL REFERENCES tenants(id)`, `job_date TEXT NOT NULL` (formato YYYY-MM-DD), `status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error'))`, `attempts INTEGER DEFAULT 0`, `worker_id UUID REFERENCES workers(id)`, `started_at TIMESTAMP`, `finished_at TIMESTAMP`, `error_msg TEXT`, `created_at TIMESTAMP DEFAULT NOW()`. Constraint UNIQUE em `(tenant_id, job_date)` para idempotencia.

#### Scenario: Enqueue nao duplica job para mesmo tenant/data
- **WHEN** `POST /api/admin/forecast/enqueue` e chamado duas vezes para o mesmo tenant/data
- **THEN** a segunda chamada e ignorada via ON CONFLICT DO NOTHING

#### Scenario: Worker pega proximo job disponivel
- **WHEN** `forecast_jobs` tem registro com `status='pending'`
- **THEN** `nextForecastJob()` atualiza para `status='running'` e retorna o job

### Requirement: ML trainer consome tabela `ml_training_jobs`
O sistema SHALL ter tabela `ml_training_jobs` com colunas: `id BIGSERIAL PK`, `tenant_id UUID NOT NULL REFERENCES tenants(id)`, `status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error'))`, `attempts INTEGER DEFAULT 0`, `mae NUMERIC`, `mape NUMERIC`, `started_at TIMESTAMP`, `finished_at TIMESTAMP`, `error_msg TEXT`, `created_at TIMESTAMP DEFAULT NOW()`. Sem constraint UNIQUE (re-treino multiplo e valido).

#### Scenario: Admin pode enfileirar re-treino para todos os tenants
- **WHEN** `POST /api/admin/ml/enqueue` e chamado
- **THEN** sao inseridos jobs `pending` em `ml_training_jobs` para todos os tenants `active`

#### Scenario: Python trainer consome jobs via polling
- **WHEN** ha jobs `pending` em `ml_training_jobs`
- **THEN** o trainer Python faz `nextTrainingJob()`, treina o modelo e marca `done` com `mae` e `mape`

#### Scenario: Python trainer sem jobs dorme 60s
- **WHEN** nao ha jobs `pending` em `ml_training_jobs`
- **THEN** o trainer aguarda 60 segundos e tenta de novo (substitui o `schedule`)

### Requirement: `forecast-cron.ts` converte-se em auto-enqueue
O sistema SHALL modificar `forecast-cron.ts` para, as 00:30 UTC, inserir jobs em `forecast_jobs` para todos os tenants ativos com `job_date = TODAY` (UTC), usando ON CONFLICT DO NOTHING. O worker `forecast-worker.ts` processa os jobs.

#### Scenario: Cron insere job de forecast para cada tenant ativo
- **WHEN** o cron das 00:30 UTC roda
- **THEN** sao inseridos jobs em `forecast_jobs` para cada tenant com `status='active'`
- **THEN** o worker `forecast-worker.ts` processa os jobs e salva em `forecast_ai_messages`
