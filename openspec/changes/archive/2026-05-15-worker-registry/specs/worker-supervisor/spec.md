## ADDED Requirements

### Requirement: Supervisor spawna workers com env vars do banco
O supervisor SHALL ler `ai_base_url`, `ai_api_key`, `ai_model` e `id` de cada worker `active` da tabela `workers` e spawnar o processo filho com essas variáveis injetadas como env vars: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `WORKER_ID`. O `DATABASE_URL` SHALL ser propagado do env do supervisor para os filhos.

#### Scenario: Worker spawna e começa a processar
- **WHEN** o supervisor spawna um processo filho com env vars corretas
- **THEN** o processo filho inicia, conecta ao banco e começa o poll loop de `enrich_jobs`

#### Scenario: Env vars inválidas (URL de AI inacessível)
- **WHEN** o processo filho tenta chamar `AI_BASE_URL` inválida e falha repetidamente
- **THEN** o processo filho sai com código não-zero, `error_count` é incrementado pelo supervisor

### Requirement: Supervisor respeita intervalo de 10 minutos entre reconciles
O supervisor SHALL aguardar 10 minutos entre cada leitura do banco para reconciliação. O primeiro reconcile SHALL acontecer imediatamente ao iniciar (sem esperar 10 minutos).

#### Scenario: Inicialização do supervisor
- **WHEN** `bun run supervisor` é iniciado
- **THEN** imediatamente spawna todos os workers `active` e agenda próximo reconcile em 10 minutos
