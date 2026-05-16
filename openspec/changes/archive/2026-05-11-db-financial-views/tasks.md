## 1. Pasta de views e arquivos SQL

- [x] 1.1 Criar pasta `src/infrastructure/db/views/`
- [x] 1.2 Criar `src/infrastructure/db/views/v_overview.sql` com `CREATE VIEW IF NOT EXISTS v_overview` retornando: `bankTotal`, `creditTotal`, `creditLimitTotal`, `creditUtilPct`, `investmentTotal`, `balanceEvolution`
- [x] 1.3 Criar `src/infrastructure/db/views/v_bank_summary.sql` com `CREATE VIEW IF NOT EXISTS v_bank_summary` agrupando contas `type = 'BANK'` por `items.connector`, retornando: `bank`, `accountCount`, `balance`, `pctOfTotal`
- [x] 1.4 Criar `src/infrastructure/db/views/v_credit_summary.sql` com `CREATE VIEW IF NOT EXISTS v_credit_summary` retornando uma linha por cartão: `name`, `lastFour`, `fatura`, `creditLimit`, `availableLimit`, `utilizacaoPct`
- [x] 1.5 Criar `src/infrastructure/db/views/v_investment_summary.sql` com `CREATE VIEW IF NOT EXISTS v_investment_summary` agrupando por `type`, retornando: `type`, `balance`, `total`, `ativos`, `inativos`, `pctOfTotal`

## 2. Integração no schema.sql

- [x] 2.1 Adicionar ao final de `src/infrastructure/db/schema.sql` os 4 blocos `CREATE VIEW IF NOT EXISTS` (copiar de cada arquivo em `views/`), precedidos de comentário `-- ── views ──`
- [x] 2.2 Verificar que o banco é recriável do zero com o schema atualizado sem erros (`bun -e "new (await import('./src/infrastructure/db/BunSQLiteAdapter.ts')).BunSQLiteAdapter()"`)

## 3. Testes de integração

- [x] 3.1 Criar `src/infrastructure/db/views.test.ts` usando Bun test runner; abrir `finance.db` via `DB_PATH` env (fallback `./finance.db`)
- [x] 3.2 Teste `v_overview — bankTotal`: verificar que `bankTotal ≈ 2610.44` (snapshot 2026-05-11)
- [x] 3.3 Teste `v_overview — creditTotal`: verificar que `creditTotal ≈ 17574.60`
- [x] 3.4 Teste `v_overview — creditUtilPct`: verificar que `creditUtilPct = 37`
- [x] 3.5 Teste `v_overview — investmentTotal`: verificar que `investmentTotal ≈ 4219.04`
- [x] 3.6 Teste `v_overview — balanceEvolution`: verificar que `balanceEvolution ≈ 20185.04`
- [x] 3.7 Teste `v_bank_summary`: verificar que `SUM(balance)` sobre todas as linhas bate com `bankTotal` de `v_overview`
- [x] 3.8 Teste `v_credit_summary`: verificar que `SUM(fatura)` sobre todas as linhas bate com `creditTotal` de `v_overview`
- [x] 3.9 Teste `v_investment_summary`: verificar que `SUM(balance)` sobre todas as linhas bate com `investmentTotal` de `v_overview`
- [x] 3.10 Teste `v_investment_summary — contagens`: verificar que `SUM(ativos + inativos) = SUM(total)` para todas as linhas
- [x] 3.11 Executar `bun test src/infrastructure/db/views.test.ts` e confirmar que todos os testes passam

## 4. Verificação final

- [x] 4.1 Verificar que `SELECT name FROM sqlite_master WHERE type='view'` retorna as 4 views no banco existente após rodar `bun run sync`
- [x] 4.2 Confirmar que `bun run sync` ainda funciona sem erros após as mudanças no `schema.sql`
