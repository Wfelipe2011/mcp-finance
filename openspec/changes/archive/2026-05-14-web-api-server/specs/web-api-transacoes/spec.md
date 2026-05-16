## ADDED Requirements

### Requirement: Endpoint GET /api/transacoes retorna transações com insights da IA
O sistema SHALL expor `GET /api/transacoes?month=YYYY-MM&limit=N&offset=N` retornando transações de `f_transacoes` enriquecidas com dados de `ai_transaction_insights` via LEFT JOIN. Parâmetros: `limit` default `50`, `offset` default `0`.

#### Scenario: Requisição básica com mês
- **WHEN** cliente envia `GET /api/transacoes?month=2025-03`
- **THEN** server retorna `200` com array de transações do mês com campos de `f_transacoes`

#### Scenario: Transações enriquecidas com insights
- **WHEN** transação tem registro em `ai_transaction_insights`
- **THEN** objeto da transação SHALL incluir `merchant_name`, `is_recurring`, `anomaly_score`, `tags`

#### Scenario: Transações sem insights retornam null nos campos de IA
- **WHEN** transação não tem registro em `ai_transaction_insights`
- **THEN** campos `merchant_name`, `is_recurring`, `anomaly_score`, `tags` SHALL ser `null`

#### Scenario: Paginação com limit e offset
- **WHEN** cliente envia `limit=20&offset=40`
- **THEN** server retorna 20 transações a partir da 41ª, ordenadas por `date_day DESC`

#### Scenario: Resposta inclui total de registros
- **WHEN** dados retornados
- **THEN** resposta SHALL incluir `total` (count total para o mês) além do array `items`
