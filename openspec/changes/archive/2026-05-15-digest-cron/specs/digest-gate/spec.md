## ADDED Requirements

### Requirement: GET /api/digest não chama AI — lê apenas do banco
O endpoint `GET /api/digest?month=YYYY-MM` SHALL nunca invocar o modelo AI diretamente. Se o digest não existe no banco, retorna `{ status: "pending", coverage: <float> }`. O endpoint é read-only em relação a `ai_monthly_digest`.

#### Scenario: Endpoint não dispara AI em nenhum caso
- **WHEN** `GET /api/digest?month=2026-05` é chamado e o digest não existe
- **THEN** a resposta é imediata com `{ status: "pending" }` — nenhuma chamada ao modelo é feita

### Requirement: Cobertura calculada em query única com LEFT JOIN
O endpoint SHALL calcular a cobertura como `COUNT(ai.transaction_id)::float / COUNT(*)` via LEFT JOIN de `f_transacoes` com `ai_transaction_insights`, retornando `0` se `COUNT(*) = 0`.

#### Scenario: Mês sem transações retorna coverage = 0
- **WHEN** `GET /api/digest?month=2025-01` é chamado e não há transações
- **THEN** retorna `{ status: "pending", coverage: 0 }`

#### Scenario: Cobertura parcial retornada corretamente
- **WHEN** 3 de 10 transações têm insight
- **THEN** retorna `{ status: "pending", coverage: 0.3 }`
