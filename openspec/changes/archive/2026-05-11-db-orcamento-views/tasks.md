## 1. SQL canônico da view

- [x] 1.1 Criar `src/infrastructure/db/views/v_budget_5030_20.sql` com a view completa usando CTEs: `renda` (AVG dos 3 últimos meses completos de entradas reais), `gastos_30d` (somas por grupo), `resultado` (3 linhas com todos os campos calculados)
- [x] 1.2 Validar manualmente a query contra `finance.db` e confirmar que retorna exatamente 3 linhas com grupos corretos

## 2. schema.sql

- [x] 2.1 Adicionar `CREATE VIEW IF NOT EXISTS v_budget_5030_20` ao final de `src/infrastructure/db/schema.sql`

## 3. Testes de integração

- [x] 3.1 Adicionar describe `v_budget_5030_20 — método 50/30/20` em `views.test.ts`
- [x] 3.2 Adicionar teste: retorna exatamente 3 linhas com grupos 'NECESSIDADES', 'DESEJOS', 'POUPANÇA'
- [x] 3.3 Adicionar teste: `pct_ideal` é 50, 30 e 20 respectivamente
- [x] 3.4 Adicionar teste: `renda_mensal_obs` é o mesmo valor para as 3 linhas e é > 0
- [x] 3.5 Adicionar teste: `delta_pct = pct_real - pct_ideal` para cada linha
- [x] 3.6 Adicionar teste: `status` assume apenas 'OK', 'ACIMA' ou 'ABAIXO'
- [x] 3.7 Adicionar teste: POUPANÇA.gasto_30d = renda_mensal_obs - NECESSIDADES.gasto_30d - DESEJOS.gasto_30d

## 4. Validação

- [x] 4.1 Executar `bun test src/infrastructure/db/views.test.ts` — todos os testes passam
- [x] 4.2 Executar `bun run sync` — sem regressão
