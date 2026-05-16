## 1. SQL canônico das views

- [x] 1.1 Criar `src/infrastructure/db/views/v_monthly_cashflow.sql` com a view completa incluindo filtro de ruído e janela de 13 meses
- [x] 1.2 Criar `src/infrastructure/db/views/v_spending_by_cat.sql` com a view completa incluindo colunas `total_30d` e `total_90d`

## 2. schema.sql

- [x] 2.1 Adicionar `CREATE VIEW IF NOT EXISTS v_monthly_cashflow` ao final de `src/infrastructure/db/schema.sql`
- [x] 2.2 Adicionar `CREATE VIEW IF NOT EXISTS v_spending_by_cat` ao final de `src/infrastructure/db/schema.sql`

## 3. Testes de integração

- [x] 3.1 Adicionar describe `v_monthly_cashflow — fluxo de caixa mensal` em `views.test.ts` com teste de número de linhas (≤ 13)
- [x] 3.2 Adicionar teste: `mes` formatado como `YYYY-MM` em todas as linhas
- [x] 3.3 Adicionar teste: `saidas_reais` sempre ≥ 0
- [x] 3.4 Adicionar teste: `saldo = entradas_reais - saidas_reais` para cada linha
- [x] 3.5 Adicionar describe `v_spending_by_cat — gastos por categoria` em `views.test.ts` com teste de colunas esperadas
- [x] 3.6 Adicionar teste: `total_90d >= total_30d` para todas as linhas (90d engloba 30d)
- [x] 3.7 Adicionar teste: nenhuma linha contém categorias de ruído

## 4. Validação

- [x] 4.1 Executar `bun test src/infrastructure/db/views.test.ts` — todos os testes passam
- [x] 4.2 Executar `bun run sync` — sem regressão
