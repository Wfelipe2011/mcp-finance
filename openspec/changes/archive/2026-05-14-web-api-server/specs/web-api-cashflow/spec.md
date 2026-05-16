## ADDED Requirements

### Requirement: Endpoint GET /api/cashflow retorna dados do mês
O sistema SHALL expor `GET /api/cashflow?month=YYYY-MM` retornando os dados de `cube_cashflow_mensal` para o mês especificado. A resposta SHALL incluir: `month`, `month_name_pt`, `total_receitas`, `total_despesas`, `cashflow_real`, `debt_inflows`, `debt_payments`, `saldo_acumulado`.

#### Scenario: Requisição com mês válido
- **WHEN** cliente envia `GET /api/cashflow?month=2025-03`
- **THEN** server retorna `200` com JSON contendo os campos de `cube_cashflow_mensal` para março 2025

#### Scenario: Parâmetro month ausente usa mês atual
- **WHEN** cliente envia `GET /api/cashflow` sem o parâmetro `month`
- **THEN** server usa o mês corrente (ano e mês do sistema) e retorna `200`

#### Scenario: Formato de mês inválido
- **WHEN** cliente envia `GET /api/cashflow?month=25-3`
- **THEN** server retorna `400` com `{ "error": "Invalid month format. Use YYYY-MM" }`

#### Scenario: Mês sem dados
- **WHEN** cliente envia mês válido sem dados no banco
- **THEN** server retorna `200` com `null` ou objeto vazio (não `404`)
