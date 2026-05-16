## ADDED Requirements

### Requirement: Endpoint GET /api/gastos retorna dados de gastos do mês
O sistema SHALL expor `GET /api/gastos?month=YYYY-MM` retornando um objeto com três listas: `grupos` (de `cube_gastos_grupo_mensal`), `categorias` (de `cube_gastos_categoria_mensal`) e `novos` (de `cube_gastos_novos`). Todas referentes ao mês especificado.

#### Scenario: Requisição com mês válido
- **WHEN** cliente envia `GET /api/gastos?month=2025-03`
- **THEN** server retorna `200` com `{ grupos: [...], categorias: [...], novos: [...] }`

#### Scenario: Grupos ordenados por total decrescente
- **WHEN** dados retornados incluem múltiplos grupos
- **THEN** a lista `grupos` SHALL estar ordenada por `total_gasto DESC`

#### Scenario: Categorias ordenadas por total decrescente
- **WHEN** dados retornados incluem múltiplas categorias
- **THEN** a lista `categorias` SHALL estar ordenada por `total_gasto DESC`

#### Scenario: Parâmetro month ausente usa mês atual
- **WHEN** cliente envia `GET /api/gastos` sem `month`
- **THEN** server usa mês corrente e retorna `200`
