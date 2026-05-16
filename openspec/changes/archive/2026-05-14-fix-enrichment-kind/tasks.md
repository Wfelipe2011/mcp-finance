## 1. Silver Layer — Enriquecimento com fallback de categoria

- [x] 1.1 Em `BunPgAdapter.ts`, no CTE `kind` do método `enrich()`, adicionar JOIN com `category_groups cg` usando `LEFT(t.category_id, 2)` para disponibilizar `cg.name_pt` e `cg.group_id` na expressão CASE
- [x] 1.2 Inserir WHEN `t.type = 'DEBIT' AND cg.name_pt = 'Transferência entre Próprias Contas' THEN 'TRANSFER'` imediatamente antes do cláusula `WHEN t.type = 'DEBIT' THEN 'EXPENSE'`
- [x] 1.3 Inserir WHEN `t.type = 'DEBIT' AND cg.name_pt = 'Investimentos' THEN 'INVEST'` imediatamente antes do cláusula `WHEN t.type = 'DEBIT' THEN 'EXPENSE'` (e após o WHEN de TRANSFER)
- [x] 1.4 Executar `enrich()` e validar: `SELECT transaction_kind, category_group_pt, COUNT(*) FROM transactions_enriched GROUP BY 1,2 ORDER BY 2,1` — confirmar que "Investimentos"/"Transferência" não aparecem mais como EXPENSE
- [x] 1.5 Validar `cube_cashflow_mensal` para Mar/2026: `total_despesas` deve cair de R$44k para ~R$19k
- [x] 1.6 Validar `cube_gastos_grupo_mensal` para Mar/2026: grupos "Investimentos" e "Transferência entre Próprias Contas" não devem aparecer
