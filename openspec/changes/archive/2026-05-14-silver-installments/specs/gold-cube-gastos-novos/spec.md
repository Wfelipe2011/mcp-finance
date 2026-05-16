## ADDED Requirements

### Requirement: Cubo representa gastos pela ótica da decisão de compra
O cubo `cube_gastos_novos` SHALL agregar apenas transações que representam uma decisão de compra no mês — primeiras parcelas (`cc_installment_number = 1`) e compras à vista (`cc_total_installments IS NULL OR cc_total_installments = 1`). Parcelas 2, 3, ... N de compras anteriores SHALL ser excluídas.

Colunas obrigatórias (mesma estrutura que `cube_gastos_mensais` para comparabilidade):
- `year`, `month`, `month_name_pt`
- `group_pt`, `category_pt`
- `display_name`
- `num_transacoes`
- `total_gastos` (soma de `ABS(amount_signed)`)

#### Scenario: Primeira parcela de uma compra parcelada entra no cubo
- **WHEN** uma transação tem `cc_installment_number = 1` e `cc_total_installments = 12`
- **THEN** ela aparece em `cube_gastos_novos` com seu `amount` (valor da parcela, não da compra total)

#### Scenario: Parcelas subsequentes não entram no cubo
- **WHEN** uma transação tem `cc_installment_number = 5`
- **THEN** ela NÃO aparece em `cube_gastos_novos`

#### Scenario: Compra à vista sem campos de parcelamento entra no cubo
- **WHEN** uma transação tem `cc_total_installments IS NULL`
- **THEN** ela aparece em `cube_gastos_novos` (compra à vista = decisão nova)

#### Scenario: Cubo se restringe a despesas de fluxo de caixa real
- **WHEN** o cubo é gerado
- **THEN** apenas `transaction_kind = 'EXPENSE'` e `is_real_cashflow = true` são incluídos, igual ao `cube_gastos_mensais`

### Requirement: Cubo permite comparação direta com cube_gastos_mensais
O cubo `cube_gastos_novos` SHALL ter a mesma granularidade e estrutura de colunas que `cube_gastos_mensais` para que ambos possam ser comparados mês a mês. A diferença entre os dois (gastos mensais - gastos novos) representa o rastro de parcelamentos anteriores que caíram no mês.

#### Scenario: Comparação entre cubos é possível sem transformação
- **WHEN** ambos os cubos são consultados para o mesmo mês/categoria/membro
- **THEN** a subtração direta de `total_gastos` é válida e representa o valor do "rastro"
