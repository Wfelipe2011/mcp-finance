## ADDED Requirements

### Requirement: Tenant ID passado diretamente no INSERT de insights
O `BunPgAdapter.aiInsights.upsertOne()` SHALL usar o `tenantId` disponível no closure do construtor diretamente como parâmetro no INSERT, em vez de `current_setting('app.tenant_id')`.

#### Scenario: upsertOne salva insight com tenant correto fora de transação
- **WHEN** `upsertOne()` é chamado pelo worker de enrich fora de uma transação ativa
- **THEN** o registro é inserido em `ai_transaction_insights` com o `tenant_id` correto
- **THEN** nenhum erro `unrecognized configuration parameter "app.tenant_id"` é lançado

#### Scenario: upsertOne em conflito atualiza o registro existente
- **WHEN** `upsertOne()` é chamado para uma `transaction_id` que já tem insight
- **THEN** o registro existente é atualizado via `ON CONFLICT DO UPDATE`
- **THEN** o `tenant_id` permanece o mesmo
