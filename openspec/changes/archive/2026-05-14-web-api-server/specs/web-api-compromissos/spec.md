## ADDED Requirements

### Requirement: Endpoint GET /api/compromissos retorna parcelas abertas
O sistema SHALL expor `GET /api/compromissos` retornando todos os registros de `cube_compromissos_ativos` — parcelas de compras parceladas ainda em aberto, sem filtro de mês (são compromissos futuros).

#### Scenario: Requisição sem parâmetros
- **WHEN** cliente envia `GET /api/compromissos`
- **THEN** server retorna `200` com array de objetos contendo campos de `cube_compromissos_ativos`

#### Scenario: Compromissos ordenados por valor total restante
- **WHEN** múltiplos compromissos existem
- **THEN** lista SHALL estar ordenada por `valor_total_restante DESC`

#### Scenario: Sem compromissos ativos
- **WHEN** nenhuma parcela aberta existe no banco
- **THEN** server retorna `200` com array vazio `[]`
