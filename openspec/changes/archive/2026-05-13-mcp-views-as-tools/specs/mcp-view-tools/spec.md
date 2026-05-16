## ADDED Requirements

### Requirement: Tools de leitura estáticas
O sistema SHALL registrar 7 Tools MCP sem parâmetros que retornam o resultado completo da view correspondente como JSON array em `content[0].text`: `get_overview`, `get_bank_summary`, `get_credit_summary`, `get_investment_summary`, `get_net_worth`, `get_investment_maturity`, `get_credit_alerts`.

#### Scenario: Invocação de tool estática
- **WHEN** um cliente MCP invoca `get_overview` sem argumentos
- **THEN** o response contém `content[0].text` com o JSON array de linhas da `v_overview`

#### Scenario: Tools estáticas listadas em tools/list
- **WHEN** um cliente MCP faz `tools/list`
- **THEN** a resposta inclui as 7 tools estáticas com suas descriptions

### Requirement: Tool get_monthly_cashflow com parâmetro months
O sistema SHALL registrar a Tool `get_monthly_cashflow` com parâmetro opcional `months` (inteiro, 1–36, default 13). A tool SHALL retornar o cashflow dos últimos `months` meses completos + mês corrente, excluindo categorias de ruído.

#### Scenario: Invocação sem parâmetro usa default 13
- **WHEN** `get_monthly_cashflow` é invocado sem argumentos
- **THEN** o response contém até 13 entradas mensais

#### Scenario: Invocação com months=6
- **WHEN** `get_monthly_cashflow` é invocado com `{ months: 6 }`
- **THEN** o response contém até 6 entradas mensais

#### Scenario: months fora dos limites é rejeitado
- **WHEN** `get_monthly_cashflow` é invocado com `{ months: 0 }` ou `{ months: 37 }`
- **THEN** o tool retorna erro de validação

### Requirement: Tool get_spending_by_cat com short_days e long_days
O sistema SHALL registrar a Tool `get_spending_by_cat` com parâmetros opcionais `short_days` (inteiro, 1–90, default 30) e `long_days` (inteiro, 2–180, default 90). SHALL ser válido apenas se `short_days < long_days`. A tool retorna `{ category, total_short, total_long }` por categoria, ordenado por `total_short DESC`.

#### Scenario: Invocação com defaults
- **WHEN** `get_spending_by_cat` é invocado sem argumentos
- **THEN** colunas `total_short` cobrem 30d e `total_long` cobrem 90d

#### Scenario: Parâmetros customizados
- **WHEN** `get_spending_by_cat` é invocado com `{ short_days: 15, long_days: 45 }`
- **THEN** colunas cobrem 15d e 45d respectivamente

#### Scenario: short_days >= long_days é rejeitado
- **WHEN** `get_spending_by_cat` é invocado com `{ short_days: 90, long_days: 30 }`
- **THEN** o tool retorna erro de validação

### Requirement: Tool get_top_categories com days e limit
O sistema SHALL registrar a Tool `get_top_categories` com parâmetros opcionais `days` (inteiro, 7–90, default 30) e `limit` (inteiro, 1–50, default 10). A tool retorna as top `limit` categorias de gasto dos últimos `days` dias com `{ category, total, pctDoTotal }`.

#### Scenario: Invocação com days=60 e limit=5
- **WHEN** `get_top_categories` é invocado com `{ days: 60, limit: 5 }`
- **THEN** o response contém até 5 categorias com gastos dos últimos 60 dias

### Requirement: Tool get_budget_5030_20 com spending_days e income_months
O sistema SHALL registrar a Tool `get_budget_5030_20` com parâmetros opcionais `spending_days` (inteiro, 1–90, default 30) e `income_months` (inteiro, 1–12, default 3). A renda de referência é calculada como a média dos últimos `income_months` meses completos; os gastos cobrem os últimos `spending_days` dias.

#### Scenario: Invocação com income_months=6
- **WHEN** `get_budget_5030_20` é invocado com `{ income_months: 6 }`
- **THEN** a renda de referência é a média dos 6 últimos meses completos

### Requirement: Parâmetros inválidos retornam erro de validação
Todas as tools parametrizadas SHALL rejeitar parâmetros fora dos limites definidos com `isError: true` e mensagem descritiva antes de executar qualquer query.

#### Scenario: Parâmetro fora do range
- **WHEN** qualquer tool parametrizada recebe valor fora dos limites
- **THEN** o response tem `isError: true` e mensagem indicando o parâmetro inválido
