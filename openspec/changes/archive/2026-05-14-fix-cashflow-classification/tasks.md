## 1. Corrigir classificador no BunPgAdapter.ts

- [x] 1.1 Em `src/infrastructure/db/BunPgAdapter.ts`, localizar o CTE `kind` com o CASE expression
- [x] 1.2 Adicionar WHEN antes do `ELSE 'INCOME'`: `WHEN t.type = 'CREDIT' AND cg.group_id IN (SELECT group_id FROM category_groups WHERE name_pt = 'Transferência entre Próprias Contas') THEN 'TRANSFER'`
- [x] 1.3 Verificar que o novo WHEN está posicionado após as regras de payment_data e antes do ELSE

## 2. Validar e re-popular transactions_enriched

- [x] 2.1 Executar `bun run enrich` para re-popular `transactions_enriched` com a nova classificação
- [x] 2.2 Validar contagem de TRANSFERs aumentou: `SELECT transaction_kind, COUNT(*) FROM transactions_enriched WHERE category_group_pt = 'Transferência entre Próprias Contas' GROUP BY transaction_kind`
- [x] 2.3 Confirmar que CREDITs de conta própria sem peer_account_id agora são TRANSFER: resultado deve ter zero rows `INCOME` para essa categoria

## 3. Validar cashflow corrigido

- [x] 3.1 Checar `cube_cashflow_mensal`: fev/2026 `total_receitas` deve ser ~R$10k (era R$136k)
- [x] 3.2 Checar mai/2026 permanece inalterado (~R$8k)
- [x] 3.3 Verificar `saldo_liquido` de fev/2026: com despesas R$66k e receitas ~R$10k, deve ser negativo (~-R$56k)
- [x] 3.4 Confirmar no front-end: aba Resumo com fev/2026 exibe valores coerentes
