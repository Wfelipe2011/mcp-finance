## ADDED Requirements

### Requirement: Sync enfileira jobs de enrich atomicamente
O sistema SHALL inserir registros em `enrich_jobs` no mesmo `sql.begin()` do sync, após o upsert de transações. Inserção SHALL usar `ON CONFLICT (transaction_id) DO NOTHING` para dedup. Apenas transações sem `ai_transaction_insights` existente SHALL ser enfileiradas.

#### Scenario: Sync bem-sucedido com novas transações
- **WHEN** o sync importa 47 transações novas para um tenant
- **THEN** 47 registros são criados em `enrich_jobs` com `status='pending'` na mesma transação

#### Scenario: Sync com transações já enriquecidas
- **WHEN** o sync re-importa transações que já têm `ai_transaction_insights`
- **THEN** nenhum novo job é criado para essas transações (ON CONFLICT DO NOTHING + filtro EXISTS)

#### Scenario: Sync falha no meio
- **WHEN** o sync falha após inserir transações mas antes de completar o `sql.begin()`
- **THEN** o rollback garante que nenhum job fica em `enrich_jobs` sem a transação correspondente

### Requirement: Worker busca próximo job com fairness entre tenants
O sistema SHALL ter lógica de `nextJob(workerId)` que: (1) sorteia aleatoriamente um `tenant_id` distinto com jobs `pending`, (2) seleciona o job com maior `date` desse tenant, (3) usa `FOR UPDATE SKIP LOCKED` para exclusividade, (4) atualiza atomicamente para `status='processing'`, `worker_id`, `started_at`, `attempts++`.

#### Scenario: Múltiplos tenants com jobs pendentes
- **WHEN** dois workers chamam `nextJob` simultaneamente com dois tenants na fila
- **THEN** cada worker obtém um job de um tenant diferente (ou do mesmo, por acaso de sorteio), sem bloqueio entre eles

#### Scenario: Fila vazia
- **WHEN** não há jobs com `status='pending'`
- **THEN** `nextJob` retorna null; o worker aguarda 5 segundos antes de tentar de novo

#### Scenario: Job mais recente selecionado primeiro
- **WHEN** o tenant tem jobs de janeiro e dezembro pendentes
- **THEN** o job de dezembro (date DESC) é selecionado primeiro

### Requirement: Worker marca job como done ou error
O sistema SHALL ter `markDone(jobId, workerId)` que atualiza `status='done'`, `finished_at=NOW()` e incrementa `workers.jobs_done`. SHALL ter `markError(jobId, error)` que incrementa `attempts`; se `attempts >= 3` atualiza `status='error'` permanente com `error_msg`; caso contrário, volta para `status='pending'`.

#### Scenario: Job concluído com sucesso
- **WHEN** o worker processa com sucesso e chama `markDone(jobId)`
- **THEN** `enrich_jobs.status='done'`, `finished_at` é definido, `workers.jobs_done` incrementado

#### Scenario: Falha com tentativas restantes
- **WHEN** o worker falha ao processar e `attempts < 3`
- **THEN** job volta para `status='pending'` com `attempts` incrementado, pronto para reprocessamento

#### Scenario: Falha com tentativas esgotadas
- **WHEN** o worker falha e `attempts >= 3`
- **THEN** job vai para `status='error'` permanente com `error_msg` preenchido

### Requirement: Liberação automática de jobs travados
O sistema SHALL executar `releaseStuck()` — que libera jobs com `status='processing'` e `started_at < NOW() - 10 minutes` de volta para `pending` — antes de cada `nextJob()`.

#### Scenario: Worker morre com job em processamento
- **WHEN** um worker pega um job e é morto antes de chamar `markDone` ou `markError`
- **THEN** após 10 minutos, qualquer outro worker que chama `nextJob` libera o job para `pending` via `releaseStuck()`
