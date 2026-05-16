## 1. SQL canônico das views

- [x] 1.1 Criar `src/infrastructure/db/views/v_net_worth.sql` com a view de patrimônio líquido (bankTotal, investmentTotal, creditTotal, netWorth)
- [x] 1.2 Criar `src/infrastructure/db/views/v_investment_maturity.sql` com a view de vencimentos (name, type, balance, dueDate, diasParaVencer, bucket)

## 2. schema.sql

- [x] 2.1 Adicionar `CREATE VIEW IF NOT EXISTS v_net_worth` ao final de `src/infrastructure/db/schema.sql`
- [x] 2.2 Adicionar `CREATE VIEW IF NOT EXISTS v_investment_maturity` ao final de `src/infrastructure/db/schema.sql`

## 3. Testes de integração

- [x] 3.1 Adicionar describe `v_net_worth — patrimônio líquido` em `views.test.ts` com teste de exatamente 1 linha
- [x] 3.2 Adicionar teste: `netWorth = bankTotal + investmentTotal - creditTotal`
- [x] 3.3 Adicionar teste: componentes de `v_net_worth` coincidem com `v_overview`
- [x] 3.4 Adicionar describe `v_investment_maturity — vencimentos de investimentos` em `views.test.ts`
- [x] 3.5 Adicionar teste: todas as linhas têm `dueDate` não-nulo e `status = 'ACTIVE'`
- [x] 3.6 Adicionar teste: `bucket` assume apenas os 5 valores válidos ('vencido', '≤30d', '31-90d', '91-365d', '>365d')
- [x] 3.7 Adicionar teste: linhas ordenadas por `dueDate ASC`

## 4. Validação

- [x] 4.1 Executar `bun test src/infrastructure/db/views.test.ts` — todos os testes passam
- [x] 4.2 Executar `bun run sync` — sem regressão
