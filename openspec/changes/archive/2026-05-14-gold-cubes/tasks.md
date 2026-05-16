## 1. View cube_gastos_mensais

- [x] 1.1 Criar view `cube_gastos_mensais` com GROUP BY `year, month, month_name_pt, category_pt, group_pt, display_name` sobre `f_fluxo_caixa JOIN d_categoria JOIN d_users`
- [x] 1.2 Filtrar apenas `transaction_kind = 'EXPENSE'` na agregação de `total_gastos`
- [x] 1.3 Testar: filtrar por `year = 2026, month = 1` e verificar resultado com valores negativos em `total_gastos`
- [x] 1.4 Testar: filtrar por `display_name = 'Wilson'` e verificar drill-down funciona

## 2. View cube_cashflow_mensal

- [x] 2.1 Criar view `cube_cashflow_mensal` com GROUP BY `year, month, month_name_pt` sobre `f_fluxo_caixa JOIN d_data`
- [x] 2.2 Calcular: `total_receitas = SUM(amount_signed) WHERE INCOME`, `total_despesas = SUM(ABS(amount_signed)) WHERE EXPENSE`
- [x] 2.3 Calcular: `saldo_liquido = total_receitas - total_despesas`
- [x] 2.4 Testar: verificar que `saldo_liquido` é coerente para um mês conhecido

## 3. View cube_patrimonio

- [x] 3.1 Criar view `cube_patrimonio` sobre `d_conta` expondo saldos atuais de `accounts.balance`
- [x] 3.2 Testar: verificar que contas BANK têm `saldo_atual` e contas CREDIT têm `limite_credito`

## 4. View cube_investimentos_mensal

- [x] 4.1 Criar view `cube_investimentos_mensal` com GROUP BY `year, month, month_name_pt, investment_name, movement_type` sobre `f_investimentos`
- [x] 4.2 Testar: verificar que COUNT > 0 e os nomes de investimento aparecem corretamente

## 5. Validação final

- [x] 5.1 Confirmar que todas as 4 views gold são acessíveis sem erro
- [x] 5.2 Confirmar que a cadeia completa funciona: bronze → silver → gold (executar uma query em cada cubo)
- [x] 5.3 Confirmar que nenhuma tabela foi criada ou modificada além das views
