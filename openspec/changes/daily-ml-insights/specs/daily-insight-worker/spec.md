## ADDED Requirements

### Requirement: Cron enfileira daily_insight_jobs diariamente às 00:35 BRT
O sistema SHALL criar `daily-insight-cron.ts` que às 00:35 BRT insere uma linha em `daily_insight_jobs` para cada tenant ativo com `status = 'pending'` e `job_date = CURRENT_DATE`.

#### Scenario: Cron não duplica job do mesmo dia
- **WHEN** o cron executa e já existe um job para (tenant_id, job_date)
- **THEN** nenhuma nova linha é inserida (UNIQUE constraint em `(tenant_id, job_date)`)

#### Scenario: Cron cria jobs apenas para tenants ativos
- **WHEN** existem 3 tenants no banco mas 1 está inativo
- **THEN** apenas 2 jobs são enfileirados

### Requirement: Worker processa jobs diários em loop de polling
O sistema SHALL criar `daily-insight-worker.ts` que em loop: busca job `pending`, atualiza para `running`, lê `daily_habit_signals` + `forecast_daily_predictions` para o tenant, chama LLM, salva em `forecast_ai_messages` com `message_type = 'daily_insight'`, atualiza job para `done`.

#### Scenario: Worker marca job como error em caso de falha
- **WHEN** a chamada ao LLM ou qualquer query SQL falha durante o processamento
- **THEN** o job é atualizado para `status = 'error'` com `error_msg` preenchido e worker continua para o próximo job

#### Scenario: Worker faz fallback quando não há sinal suficiente
- **WHEN** nenhuma categoria tem `probability >= 0.3` e `occurrences_6m >= 3`
- **THEN** nenhuma mensagem é salva para esse tenant/dia e o job é marcado `done` com log `status=no_signal`

### Requirement: Worker gera mensagem LLM com prompt estruturado em pt-BR
O sistema SHALL chamar `generateDailyInsightMessage()` em `forecastAgent.ts` passando JSON com `insight_type`, `category_pt`, `occurrences`, `avg_amount`, `probability` e `suggested_action_type`. A função SHALL retornar uma string de 1–2 frases em pt-BR.

#### Scenario: Prompt inclui categoria e ação sugerida
- **WHEN** a categoria top é "Delivery" e o dia é sexta-feira
- **THEN** o prompt ao LLM inclui `"suggested_action_type": "cook_at_home"` ou equivalente mapeado

#### Scenario: Mensagem salva com message_type correto
- **WHEN** o worker salva o insight gerado
- **THEN** `forecast_ai_messages.message_type = 'daily_insight'` e `message_date = CURRENT_DATE`

### Requirement: Tabela `daily_insight_jobs` suporta RLS por tenant
O sistema SHALL criar a tabela com `tenant_id UUID FK` e habilitar RLS com policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.

#### Scenario: Worker usa conexão com tenant_id configurado
- **WHEN** o worker faz query para buscar jobs pendentes
- **THEN** usa `set_config('app.tenant_id', ...)` antes da query, respeitando isolamento

#### Scenario: Jobs de outros tenants são invisíveis
- **WHEN** um tenant consulta `daily_insight_jobs`
- **THEN** vê apenas seus próprios jobs

### Requirement: Migração aditiva de `forecast_ai_messages` com discriminador `message_type`
O sistema SHALL aplicar migration SQL: `ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'monthly' CHECK (message_type IN ('monthly', 'daily_insight'))` e reconstruir o UNIQUE constraint incluindo `message_type`.

#### Scenario: Registros existentes não são afetados
- **WHEN** a migration é aplicada com registros existentes em `forecast_ai_messages`
- **THEN** todos os registros existentes recebem `message_type = 'monthly'` automaticamente via DEFAULT

#### Scenario: Dois insights do mesmo dia podem coexistir
- **WHEN** existe uma mensagem mensal e uma mensagem diária para o mesmo tenant na mesma data
- **THEN** ambas coexistem pois o UNIQUE é em `(tenant_id, message_date, message_type)`
