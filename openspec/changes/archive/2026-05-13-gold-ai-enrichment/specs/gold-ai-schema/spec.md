## ADDED Requirements

### Requirement: Tabela ai_transaction_insights armazena análises do LLM
O sistema SHALL criar tabela `ai_transaction_insights` com colunas: `transaction_id` (TEXT PK, FK para `transactions_enriched`), `merchant_name` (TEXT), `merchant_country` (TEXT), `is_recurring` (BOOLEAN), `recurrence_period` (TEXT), `expense_context` (TEXT: 'personal'/'work'/'shared'), `anomaly_score` (NUMERIC 0.00–1.00), `tags` (TEXT[]), `category_hint` (TEXT), `raw_response` (JSONB), `analyzed_at` (TIMESTAMP), `model_version` (TEXT NOT NULL).

#### Scenario: Insight inserido com todos os campos obrigatórios
- **WHEN** o pipeline de enrichment processa uma transação com sucesso
- **THEN** uma linha é inserida em `ai_transaction_insights` com `transaction_id`, `model_version` e `analyzed_at` não-nulos

#### Scenario: Transação já analisada não é reprocessada
- **WHEN** o pipeline é executado e a transação já existe em `ai_transaction_insights`
- **THEN** nenhum novo INSERT é feito para aquela transação (idempotência)
