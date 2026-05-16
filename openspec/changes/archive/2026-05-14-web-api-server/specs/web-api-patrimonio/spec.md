## ADDED Requirements

### Requirement: Endpoint GET /api/patrimonio retorna saldos por conta
O sistema SHALL expor `GET /api/patrimonio` retornando todos os registros de `cube_patrimonio` com saldo atual por conta, agrupados por tipo e subtipo.

#### Scenario: Requisição sem parâmetros
- **WHEN** cliente envia `GET /api/patrimonio`
- **THEN** server retorna `200` com array de contas contendo `nome`, `tipo`, `subtipo`, `saldo_atual`

#### Scenario: Contas ordenadas por saldo decrescente
- **WHEN** múltiplas contas existem
- **THEN** array SHALL estar ordenado por `saldo_atual DESC`

#### Scenario: Total de patrimônio calculado no server
- **WHEN** dados retornados incluem múltiplas contas
- **THEN** resposta SHALL incluir campo `total_patrimonio` com soma de todos os `saldo_atual`
