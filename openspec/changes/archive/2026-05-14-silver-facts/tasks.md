## 1. View f_transacoes

- [x] 1.1 Criar view `f_transacoes` sobre `transactions_enriched` com JOIN em `d_users` (por `owner_normalized`)
- [x] 1.2 Implementar `amount_signed` com CASE por `transaction_kind`: EXPENSE→`-ABS(amount)`, INCOME→`+ABS(amount)`, INVEST→`-ABS(amount)`, TRANSFER→`amount`
- [x] 1.3 Extrair `date_day` como `(date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::DATE`
- [x] 1.4 Verificar que COUNT de `f_transacoes` = COUNT de `transactions_enriched`
- [x] 1.5 Verificar que EXPENSE retorna apenas `amount_signed < 0` e INCOME retorna apenas `amount_signed > 0`

## 2. View f_fluxo_caixa

- [x] 2.1 Criar view `f_fluxo_caixa` como `SELECT * FROM f_transacoes WHERE is_real_cashflow = true`
- [x] 2.2 Verificar que nenhum TRANSFER aparece na view
- [x] 2.3 Verificar que `SUM(amount_signed)` produz resultado razoável (não-nulo)

## 3. View f_investimentos

- [x] 3.1 Criar view `f_investimentos` com JOIN `investment_transactions INNER JOIN investments ON investment_id`
- [x] 3.2 Extrair `date_day` da coluna `date` da mesma forma que `f_transacoes`
- [x] 3.3 Verificar que COUNT de `f_investimentos` = COUNT de `investment_transactions`

## 4. Validação final

- [x] 4.1 Confirmar que todas as 3 views são acessíveis sem erro
- [x] 4.2 Confirmar que nenhuma tabela bronze foi alterada
- [x] 4.3 Testar JOIN `f_transacoes JOIN d_conta USING (account_id)` retorna resultado correto
