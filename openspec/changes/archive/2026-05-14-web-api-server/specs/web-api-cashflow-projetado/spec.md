## ADDED Requirements

### Requirement: Endpoint GET /api/cashflow/projetado retorna série histórica e projetada
O sistema SHALL expor `GET /api/cashflow/projetado` retornando todos os registros de `cube_cashflow_projetado`, incluindo meses históricos (`is_projected=false`) e meses futuros projetados via parcelas (`is_projected=true`).

#### Scenario: Requisição sem parâmetros
- **WHEN** cliente envia `GET /api/cashflow/projetado`
- **THEN** server retorna `200` com array de objetos incluindo campo `is_projected` boolean

#### Scenario: Série ordenada cronologicamente
- **WHEN** dados incluem meses históricos e projetados
- **THEN** array SHALL estar ordenado por `month ASC` (data)

#### Scenario: Distinção visual entre histórico e projetado
- **WHEN** resposta inclui meses futuros
- **THEN** esses registros SHALL ter `is_projected: true`, permitindo ao client renderizar tracejado
