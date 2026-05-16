## ADDED Requirements

### Requirement: Endpoint GET /api/investimentos retorna movimentações mensais
O sistema SHALL expor `GET /api/investimentos?months=N` retornando os últimos N meses de `cube_investimentos_mensal`. O parâmetro `months` é opcional com default `6`.

#### Scenario: Requisição com months=3
- **WHEN** cliente envia `GET /api/investimentos?months=3`
- **THEN** server retorna `200` com array dos últimos 3 meses de movimentações de investimento

#### Scenario: Parâmetro months ausente usa default 6
- **WHEN** cliente envia `GET /api/investimentos` sem `months`
- **THEN** server retorna os últimos 6 meses

#### Scenario: Série ordenada cronologicamente
- **WHEN** múltiplos meses retornados
- **THEN** array SHALL estar ordenado por `month ASC`
