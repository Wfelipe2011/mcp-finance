## ADDED Requirements

### Requirement: kpi_runway_imediato view existe e retorna fôlego baseado em conta corrente/poupança
O sistema SHALL criar (ou renomear a partir de `kpi_cash_runway`) uma view `kpi_runway_imediato` que calcula o fôlego financeiro usando apenas o saldo em contas do tipo `CHECKING_ACCOUNT` e `SAVINGS_ACCOUNT`, com a média de despesas dos últimos 3 meses como denominador.

#### Scenario: View retorna runway imediato com saldo de conta corrente
- **WHEN** `kpi_runway_imediato` é consultada com contas correntes populadas
- **THEN** retorna `saldo_liquido` igual à soma dos `balance` das contas `CHECKING_ACCOUNT` e `SAVINGS_ACCOUNT`
- **AND** retorna `runway_imediato_meses` igual a `ROUND(saldo_liquido / media_saidas_90d, 1)`

#### Scenario: View retorna NULL quando não há histórico de despesas
- **WHEN** não existem registros em `cube_cashflow_mensal`
- **THEN** `runway_imediato_meses` é NULL (não divide por zero)

---

### Requirement: kpi_runway_total view existe e retorna fôlego incluindo todos os investimentos
O sistema SHALL criar uma view `kpi_runway_total` que calcula o fôlego financeiro usando o saldo em contas correntes/poupança **somado ao saldo de todos os investimentos** (`investments.balance`), com a mesma média de despesas de 90 dias como denominador.

#### Scenario: View soma saldo de conta e investimentos
- **WHEN** `kpi_runway_total` é consultada com contas e investimentos populados
- **THEN** `saldo_total` é igual a `saldo_liquido (conta) + COALESCE(SUM(investments.balance), 0)`
- **AND** `runway_total_meses` é igual a `ROUND(saldo_total / media_saidas_90d, 1)`

#### Scenario: View retorna mesmo valor que kpi_runway_imediato quando investimentos estão zerados
- **WHEN** a tabela `investments` está vazia ou todos os balances são NULL
- **THEN** `runway_total_meses` é igual a `runway_imediato_meses`

#### Scenario: View retorna NULL quando não há histórico de despesas
- **WHEN** não existem registros em `cube_cashflow_mensal`
- **THEN** `runway_total_meses` é NULL

---

### Requirement: Alias de compatibilidade kpi_cash_runway mantido
O sistema SHALL manter a view `kpi_cash_runway` como alias de `kpi_runway_imediato` para evitar quebra de queries existentes durante a transição.

#### Scenario: Alias retorna mesmos dados
- **WHEN** `kpi_cash_runway` é consultada
- **THEN** retorna os mesmos dados que `kpi_runway_imediato`

---

### Requirement: Endpoint /api/runway retorna as duas métricas
O sistema SHALL atualizar o endpoint `GET /api/runway` para retornar ambas as métricas de fôlego financeiro nos campos `runway_imediato_meses` e `runway_total_meses`, além de `saldo_liquido`, `saldo_investimentos` e `media_saidas_90d`.

#### Scenario: Endpoint retorna objeto com ambas as métricas
- **WHEN** `GET /api/runway` é chamado com dados populados
- **THEN** a resposta contém `runway_imediato_meses` (number | null) e `runway_total_meses` (number | null)
- **AND** contém `saldo_liquido` (saldo em conta) e `saldo_investimentos` (saldo em investimentos)

---

### Requirement: RunwayIndicator exibe as duas métricas lado a lado
O sistema SHALL atualizar o componente `RunwayIndicator` para exibir dois chips: um para "Fôlego imediato" (conta corrente) e outro para "Fôlego total" (conta + investimentos). A cor semântica é calculada independentemente para cada métrica.

#### Scenario: Dois chips são exibidos quando dados disponíveis
- **WHEN** `RunwayIndicator` recebe dados com ambas as métricas
- **THEN** exibe dois `Chip` MUI — um com label de fôlego imediato e outro com fôlego total

#### Scenario: Cor semântica calculada por chip
- **WHEN** `runway_imediato_meses` < 1 e `runway_total_meses` >= 3
- **THEN** o chip imediato usa cor `error` e o chip total usa cor `success`

### Requirement: Tipo Runway na API inclui novas métricas
O tipo `Runway` em `client/src/api/types.ts` SHALL ser atualizado para incluir `runway_imediato_meses: number | null`, `runway_total_meses: number | null` e `saldo_investimentos: number`. O campo `runway_meses` SHALL ser removido (substituído pelos dois campos novos).

#### Scenario: Tipo reflete as duas métricas
- **WHEN** o tipo `Runway` é usado no frontend
- **THEN** contém `runway_imediato_meses` e `runway_total_meses` em vez de `runway_meses`
