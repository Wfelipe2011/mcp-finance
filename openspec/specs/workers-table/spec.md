## Requirements

### Requirement: Tabela workers como registro de modelos AI
O sistema SHALL ter tabela `workers` com campos: `id` (UUID DEFAULT gen_random_uuid() PK), `name` (TEXT NOT NULL — ex: "Gemma 4 via OpenRouter"), `ai_base_url` (TEXT NOT NULL), `ai_api_key` (TEXT), `ai_model` (TEXT NOT NULL), `status` (TEXT NOT NULL DEFAULT 'idle', CHECK em `idle`/`busy`/`error`/`offline`), `error_count` (INT NOT NULL DEFAULT 0), `last_error` (TEXT NULL), `jobs_done` (INT NOT NULL DEFAULT 0), `last_seen_at` (TIMESTAMP NULL), `created_at` (TIMESTAMP DEFAULT now()).

#### Scenario: Cadastro de novo worker
- **WHEN** um novo worker é inserido com `ai_base_url` e `ai_model` válidos
- **THEN** o registro é criado com `status='idle'`, `error_count=0`, `jobs_done=0`

#### Scenario: Status inválido
- **WHEN** tenta-se inserir worker com `status` diferente de 'idle', 'busy', 'error' ou 'offline'
- **THEN** o banco retorna erro de violação de CHECK constraint

### Requirement: Workers não têm RLS
A tabela `workers` SHALL NOT ter RLS habilitado. O supervisor precisa listar todos os workers ativos de todos os tenants (workers são recursos globais do sistema, não por tenant).

#### Scenario: Select sem contexto de tenant
- **WHEN** `SELECT * FROM workers WHERE status = 'idle'` é executado sem `SET LOCAL`
- **THEN** todos os workers idle são retornados independente de tenant

### Requirement: Referência de worker em enrich_jobs
A tabela `enrich_jobs` SHALL ter coluna `worker_id UUID NULL REFERENCES workers(id)` que registra qual worker processou cada job. Isso permite rastreamento de erros por worker e identificação de workers problemáticos.

#### Scenario: Job processado por worker específico
- **WHEN** um worker pega e conclui um job
- **THEN** `enrich_jobs.worker_id` é preenchido com o `id` do worker e `workers.jobs_done` é incrementado
