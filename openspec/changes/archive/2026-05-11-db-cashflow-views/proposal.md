## Why

As views existentes (`v_overview`, `v_bank_summary`, `v_credit_summary`, `v_investment_summary`) respondem "quanto tenho?" — um snapshot patrimonial estático. O assistente financeiro ainda não consegue responder "para onde vai meu dinheiro?" nem "estou gastando mais do que recebo?". Sem visão de fluxo, o modelo não tem base para orientar o usuário sobre controle de gastos e formação de poupança.

## What Changes

- Nova view `v_monthly_cashflow`: fluxo de caixa mensal real dos últimos 13 meses com entradas, saídas, saldo e percentual de poupança — excluindo transações de ruído (transferências entre contas, pagamentos de cartão, movimentações de investimento)
- Nova view `v_spending_by_cat`: gastos reais por categoria dos últimos 30 e 90 dias, ordenados por volume, excluindo categorias de ruído

## Capabilities

### New Capabilities
- `cashflow-views`: Duas views SQLite que expõem fluxo de caixa mensal e distribuição de gastos por categoria, com filtros de ruído embutidos para que o MCP consuma dados financeiros límpidos e prontos para análise

### Modified Capabilities
- `db-schema`: schema.sql passa a incluir `CREATE VIEW IF NOT EXISTS` para `v_monthly_cashflow` e `v_spending_by_cat`

## Impact

- `src/infrastructure/db/schema.sql`: adição das 2 novas views
- `src/infrastructure/db/views/v_monthly_cashflow.sql`: arquivo canônico da view
- `src/infrastructure/db/views/v_spending_by_cat.sql`: arquivo canônico da view
- `src/infrastructure/db/views.test.ts`: novos testes de integração contra `finance.db`
- Sem alteração nas tabelas, sem breaking changes, sem impacto no `bun run sync`
