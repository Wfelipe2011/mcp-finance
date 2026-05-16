## ADDED Requirements

### Requirement: View f_parcelas expõe campos de parcelamento com derivações
A view `f_parcelas` SHALL projetar todas as transações de cartão de crédito que possuem `cc_total_installments` preenchido, incluindo colunas derivadas para classificação e cálculo de restante. A view é um subset de `transactions_enriched` e não substitui `f_transacoes`.

Colunas obrigatórias:
- `transaction_id`, `account_id`, `user_id`, `date_day`, `amount_signed`, `amount_raw`
- `transaction_kind`, `description`, `category_pt`, `category_group_pt`, `owner_normalized`
- `cc_installment_number`, `cc_total_installments`, `cc_purchase_date`
- `is_installment` (BOOLEAN): `cc_total_installments > 1`
- `is_first_installment` (BOOLEAN): `cc_installment_number = 1`
- `installments_remaining` (INTEGER): `cc_total_installments - cc_installment_number`

#### Scenario: Transação parcelada aparece com flags corretos
- **WHEN** uma transação tem `cc_total_installments = 12` e `cc_installment_number = 3`
- **THEN** `is_installment = true`, `is_first_installment = false`, `installments_remaining = 9`

#### Scenario: Primeira parcela é identificada corretamente
- **WHEN** uma transação tem `cc_installment_number = 1`
- **THEN** `is_first_installment = true`

#### Scenario: Transações sem campos de parcelamento não aparecem na view
- **WHEN** uma transação não tem `cc_total_installments` preenchido (compra à vista ou débito)
- **THEN** ela não aparece em `f_parcelas`

#### Scenario: Normalização de timezone é aplicada à data
- **WHEN** `date` está armazenado como ISO 8601 UTC
- **THEN** `date_day` é convertido para `America/Sao_Paulo` antes de truncar para DATE

### Requirement: Join com d_users é obrigatório para preservar o padrão do star schema
A view `f_parcelas` SHALL fazer JOIN com `d_users` via `owner_normalized` para incluir `user_id`, mantendo consistência com `f_transacoes` e permitindo drill por membro da família.

#### Scenario: Transação sem owner_normalized mapeado não aparece na view
- **WHEN** `transactions_enriched.owner_normalized` não tem correspondente em `d_users`
- **THEN** a transação é excluída da view (INNER JOIN, não LEFT JOIN)
