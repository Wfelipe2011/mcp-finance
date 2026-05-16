## ADDED Requirements

### Requirement: Endpoint GET /api/runway retorna fôlego financeiro atual
O sistema SHALL expor `GET /api/runway` retornando os dados de `kpi_cash_runway`: saldo líquido atual em contas correntes/poupança, média de saídas nos últimos 90 dias e o runway em meses calculado.

#### Scenario: Requisição sem parâmetros
- **WHEN** cliente envia `GET /api/runway`
- **THEN** server retorna `200` com `{ saldo_liquido, media_saidas_90d, runway_meses }`

#### Scenario: Todos os campos são numéricos
- **WHEN** dados existem no banco
- **THEN** `saldo_liquido`, `media_saidas_90d` e `runway_meses` SHALL ser números (não strings)

#### Scenario: Runway zero quando sem dados históricos
- **WHEN** não há transações suficientes para calcular média
- **THEN** `runway_meses` SHALL retornar `null` ou `0`, não lançar erro
