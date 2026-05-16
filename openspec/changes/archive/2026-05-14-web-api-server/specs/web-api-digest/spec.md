## ADDED Requirements

### Requirement: Endpoint GET /api/digest retorna análise mensal da IA
O sistema SHALL expor `GET /api/digest?month=YYYY-MM` retornando o registro de `ai_monthly_digest` para o mês especificado, incluindo `narrative_pt`, `structured_summary`, `flags` e `notable_expenses`.

#### Scenario: Requisição com mês que tem digest gerado
- **WHEN** cliente envia `GET /api/digest?month=2025-03`
- **THEN** server retorna `200` com objeto contendo `narrative_pt` (string), `flags` (array), `notable_expenses` (array)

#### Scenario: Mês sem digest gerado
- **WHEN** digest não foi gerado para o mês solicitado
- **THEN** server retorna `200` com `null` (não `404`) para o client tratar gracefully

#### Scenario: notable_expenses como array tipado
- **WHEN** digest existe com despesas notáveis
- **THEN** `notable_expenses` SHALL ser array de objetos com `description`, `amount`, `reason`

#### Scenario: flags como array de strings
- **WHEN** digest existe com flags
- **THEN** `flags` SHALL ser array de strings (ex: `["gastos_atipicos", "emprestimo_detectado"]`)
