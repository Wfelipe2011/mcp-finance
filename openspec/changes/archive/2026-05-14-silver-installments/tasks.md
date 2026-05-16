## 1. View Silver — f_parcelas

- [x] 1.1 Adicionar `CREATE OR REPLACE VIEW f_parcelas` em `silver-facts.sql` com JOIN em `transactions_enriched` e `d_users`, filtrando `WHERE cc_total_installments IS NOT NULL`
- [x] 1.2 Incluir colunas derivadas: `is_installment`, `is_first_installment`, `installments_remaining`
- [x] 1.3 Aplicar conversão de timezone `America/Sao_Paulo` em `date_day` (igual a `f_transacoes`)
- [x] 1.4 Executar a view no banco e verificar contagem: deve bater com `SELECT COUNT(*) FROM transactions WHERE cc_total_installments IS NOT NULL`

## 2. Cubo Gold — cube_compromissos_ativos

- [x] 2.1 Adicionar `CREATE OR REPLACE VIEW cube_compromissos_ativos` em `gold-cubes.sql` com agrupamento por `(description, DATE(cc_purchase_date::TIMESTAMPTZ), amount, account_id)`
- [x] 2.2 Usar `HAVING MAX(cc_installment_number) < MAX(cc_total_installments)` para excluir compras já quitadas
- [x] 2.3 Calcular `compromisso_restante = (MAX(total) - MAX(installment_number)) * amount`
- [x] 2.4 Incluir JOIN com `accounts` para coluna `cartao` e `d_users` para coluna `dono`
- [x] 2.5 Validar resultado total: soma de `compromisso_restante` deve ser ~R$110k conforme análise exploratória

## 3. Cubo Gold — cube_gastos_novos

- [x] 3.1 Adicionar `CREATE OR REPLACE VIEW cube_gastos_novos` em `gold-cubes.sql` baseado na estrutura de `cube_gastos_mensais`
- [x] 3.2 Filtrar `WHERE transaction_kind = 'EXPENSE' AND is_real_cashflow = true`
- [x] 3.3 Aplicar filtro de decisão: `(cc_installment_number = 1 OR cc_total_installments IS NULL OR cc_total_installments = 1)`
- [x] 3.4 Manter mesmas colunas que `cube_gastos_mensais` para comparabilidade direta
- [x] 3.5 Verificar que a diferença `cube_gastos_mensais.total_gastos - cube_gastos_novos.total_gastos` representa o rastro de parcelamentos (deve ser positivo e crescente nos meses com mais histórico)

## 4. Aplicar no banco e validar

- [x] 4.1 Executar o SQL atualizado de `silver-facts.sql` no banco (via psql ou docker exec)
- [x] 4.2 Executar o SQL atualizado de `gold-cubes.sql` no banco
- [x] 4.3 Confirmar que `cube_gastos_mensais` e `cube_cashflow_mensal` existentes retornam os mesmos valores de antes (sem regressão)
- [x] 4.4 Confirmar que `f_parcelas` retorna ~438 linhas (matching com análise do bronze)
- [x] 4.5 Conferir `cube_compromissos_ativos` para PIC PAY MASTERCARD GOLD: deve aproximar R$66k (maior passivo encontrado)
