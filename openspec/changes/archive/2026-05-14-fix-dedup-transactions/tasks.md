## 1. Silver Layer — Deduplicação no enrich()

- [x] 1.1 Em `BunPgAdapter.ts`, no método `enrichTransactions.enrich()`, adicionar CTE `deduplicated` que usa `DISTINCT ON (account_id, date::date, ABS(amount), type) ... ORDER BY ... updated_at DESC`
- [x] 1.2 Substituir `FROM transactions t` por `FROM deduplicated t` no corpo principal do INSERT INTO transactions_enriched
- [x] 1.3 Rodar `bun run sync` (ou simular enrich) e verificar no banco: `SELECT COUNT(*) FROM transactions_enriched` antes e depois — deve cair o número de linhas duplicadas
- [x] 1.4 Validar Mar/2026: checar que `cube_cashflow_mensal` para month=3/2026 mostra `total_receitas` sem os R$16.180 inflados
