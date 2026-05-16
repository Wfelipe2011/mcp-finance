## 1. SQL canônico das views

- [x] 1.1 Criar `src/infrastructure/db/views/v_credit_alerts.sql` com a view de alertas de cartão (name, lastFour, fatura, vencimento, proximoVencimento, diasParaVencer, minimo, utilizacaoPct, statusAlerta)
- [x] 1.2 Criar `src/infrastructure/db/views/v_top_categories_30d.sql` com a view de top 10 categorias (category, total, pctDoTotal), excluindo ruído, LIMIT 10

## 2. schema.sql

- [x] 2.1 Adicionar `CREATE VIEW IF NOT EXISTS v_credit_alerts` ao final de `src/infrastructure/db/schema.sql`
- [x] 2.2 Adicionar `CREATE VIEW IF NOT EXISTS v_top_categories_30d` ao final de `src/infrastructure/db/schema.sql`

## 3. Testes de integração

- [x] 3.1 Adicionar describe `v_credit_alerts — alertas de cartão` em `views.test.ts`
- [x] 3.2 Adicionar teste: número de linhas igual ao número de contas CREDIT
- [x] 3.3 Adicionar teste: `statusAlerta` assume apenas os 4 valores válidos ('VENCIDO', 'URGENTE', 'ATENÇÃO', 'OK')
- [x] 3.4 Adicionar teste: `proximoVencimento` é sempre posterior a `vencimento`
- [x] 3.5 Adicionar describe `v_top_categories_30d — top categorias 30d` em `views.test.ts`
- [x] 3.6 Adicionar teste: retorna no máximo 10 linhas
- [x] 3.7 Adicionar teste: nenhuma linha contém categorias de ruído
- [x] 3.8 Adicionar teste: `pctDoTotal` de todas as linhas somado é ≤ 100

## 4. Validação

- [x] 4.1 Executar `bun test src/infrastructure/db/views.test.ts` — todos os testes passam
- [x] 4.2 Executar `bun run sync` — sem regressão
