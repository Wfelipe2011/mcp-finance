## Why

Com dimensões e fatos no prata, a camada ouro entrega inteligência pré-computada: respostas rápidas para as perguntas financeiras mais comuns da família. Os cubos OLAP permitem que agentes LLM (via MCP) e dashboards respondam instantaneamente perguntas como "qual meu gasto mensal por categoria?" sem varrer 3.000+ linhas de transações.

## What Changes

- Cria view `cube_gastos_mensais` — total de gastos por mês × categoria × membro
- Cria view `cube_cashflow_mensal` — receitas vs despesas reais por mês, saldo líquido
- Cria view `cube_patrimonio` — snapshot de saldo atual por conta e por tipo
- Cria view `cube_investimentos_mensal` — movimentações de investimento por mês e tipo
- Todas como views regulares (não materialized) sobre as views silver

## Capabilities

### New Capabilities

- `gold-cube-gastos`: View OLAP de gastos mensais por categoria e membro
- `gold-cube-cashflow`: View OLAP de fluxo de caixa mensal (receitas - despesas)
- `gold-cube-patrimonio`: View snapshot de patrimônio atual por conta
- `gold-cube-investimentos`: View OLAP de movimentações de investimento

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Depende de `silver-facts` e `silver-dimensions` implementados
- Consumido diretamente por MCP tools analíticas
- Nenhuma tabela criada — apenas views sobre views silver
