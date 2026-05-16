## ADDED Requirements

### Requirement: Endpoint GET /api/meses retorna meses disponíveis no banco
O sistema SHALL expor `GET /api/meses` retornando a lista de meses que possuem dados em `cube_cashflow_mensal`, ordenados decrescentemente. Isso alimenta o month picker do client.

#### Scenario: Requisição sem parâmetros
- **WHEN** cliente envia `GET /api/meses`
- **THEN** server retorna `200` com array de strings no formato `YYYY-MM`, ordenado por data decrescente

#### Scenario: Formato de saída consistente
- **WHEN** dados existem no banco
- **THEN** cada item SHALL ser string `YYYY-MM` (ex: `["2026-05", "2026-04", "2025-03"]`)

#### Scenario: Sem dados no banco
- **WHEN** banco não tem registros em `cube_cashflow_mensal`
- **THEN** server retorna `200` com array vazio `[]`
