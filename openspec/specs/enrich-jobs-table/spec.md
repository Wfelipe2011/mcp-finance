## Requirements

### Requirement: Tabela enrich_jobs como fila transacional
O sistema SHALL ter tabela `enrich_jobs` com campos: `id` (BIGSERIAL PK), `tenant_id` (UUID NOT NULL REFERENCES tenants(id)), `transaction_id` (TEXT NOT NULL), `date` (TEXT — data da transação para ordenação), `status` (TEXT NOT NULL DEFAULT 'pending', CHECK em `pending`/`running`/`done`/`error`), `attempts` (INT NOT NULL DEFAULT 0), `worker_id` (UUID NULL REFERENCES workers(id)), `started_at` (TIMESTAMP NULL), `finished_at` (TIMESTAMP NULL), `error_msg` (TEXT NULL), `created_at` (TIMESTAMP DEFAULT now()), com constraint UNIQUE `(transaction_id)`.

#### Scenario: Job duplicado na fila
- **WHEN** o sync tenta enfileirar uma transação que já tem job `done` ou `pending`
- **THEN** a constraint UNIQUE `(transaction_id)` impede duplicata via `ON CONFLICT DO NOTHING`

#### Scenario: Status inválido
- **WHEN** tenta-se atualizar um job para status fora do CHECK constraint
- **THEN** o banco retorna erro de violação de CHECK constraint

### Requirement: Índice de suporte para query do worker
O sistema SHALL criar índice em `(status, tenant_id, date DESC)` na tabela `enrich_jobs` para suportar eficientemente a query de seleção do próximo job com sorteio de tenant e ordenação por data decrescente.

#### Scenario: Performance da query de sorteio
- **WHEN** o worker executa a query de next-job com `WHERE status = 'pending'`
- **THEN** o índice permite varredura eficiente sem full table scan

### Requirement: Semântica de lock para processamento concorrente
A query de seleção de próximo job SHALL usar `FOR UPDATE SKIP LOCKED` para garantir que dois workers nunca processem o mesmo job simultaneamente, sem causar bloqueio entre workers.

#### Scenario: Dois workers competindo pelo mesmo job
- **WHEN** dois workers executam a query de next-job simultaneamente
- **THEN** cada worker obtém um job diferente; nenhum dos dois bloqueia o outro

#### Scenario: Fila vazia
- **WHEN** não há jobs com `status = 'pending'`
- **THEN** a query retorna zero linhas e o worker aguarda antes de tentar de novo

### Requirement: Anti-monopolização por tenant via sorteio aleatório
A query de next-job SHALL primeiro sortear aleatoriamente um tenant que tenha jobs `pending`, depois selecionar o job mais recente (maior `date`) desse tenant. Isso garante que um tenant com muitos jobs não monopolize todos os workers.

#### Scenario: Múltiplos tenants com jobs pendentes
- **WHEN** tenant A tem 900 jobs e tenant B tem 100 jobs, e dois workers executam a query
- **THEN** cada worker sorteia um tenant de forma independente, garantindo que ambos os tenants progridam

### Requirement: Liberação automática de jobs travados
O sistema SHALL ter mecanismo para detectar jobs que ficaram `running` por mais de 10 minutos (worker morreu sem atualizar) e redefini-los para `pending`. Isso previne que jobs fiquem órfãos para sempre.

#### Scenario: Worker morre com job em processamento
- **WHEN** um worker pega um job e morre antes de marcar como `done` ou `error`
- **THEN** após 10 minutos, o job é redefinido para `pending` e `attempts` incrementado, permitindo reprocessamento

### Requirement: enrich_jobs sem RLS
A tabela `enrich_jobs` SHALL NOT ter RLS habilitado. Processos internos (supervisor, workers) precisam enxergar todos os tenants para distribuição de trabalho.

#### Scenario: Select em enrich_jobs sem contexto de tenant
- **WHEN** `SELECT * FROM enrich_jobs WHERE status = 'pending'` é executado sem `SET LOCAL`
- **THEN** jobs de todos os tenants são retornados
