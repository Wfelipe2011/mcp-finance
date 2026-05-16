## MODIFIED Requirements

### Requirement: Classificação transaction_kind
O sistema SHALL classificar cada transação em exatamente um de: `EXPENSE`, `INCOME`, `TRANSFER`, `INVEST`, de acordo com a lógica de prioridade definida (em ordem de precedência):

1. `operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')` → `INVEST`
2. `type = 'CREDIT'` e `payment_data.payer.accountNumber` em `accounts` → `TRANSFER`
3. `type = 'DEBIT'` e `payment_data.receiver.accountNumber` em `accounts` → `TRANSFER`
4. `type = 'DEBIT'`, conta BANK, description contém "pagamento de fatura" ou "gastos cartao" → `TRANSFER`
5. `type = 'CREDIT'`, conta CREDIT, description contém "pagamento"+"fatura" ou "inclusao pgto" → `TRANSFER`
6. `type = 'DEBIT'` e `category_group_pt = 'Transferência entre Próprias Contas'` → `TRANSFER`
7. `type = 'DEBIT'` e `category_group_pt = 'Investimentos'` → `INVEST`
8. **[NOVO]** `type = 'CREDIT'` e `category_group_pt = 'Transferência entre Próprias Contas'` → `TRANSFER`
9. `type = 'DEBIT'` → `EXPENSE`
10. `type = 'CREDIT'` → `INCOME`

#### Scenario: Aporte/resgate de investimento classificado como INVEST
- **WHEN** uma transação tem `operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')`
- **THEN** `transaction_kind = 'INVEST'`

#### Scenario: Crédito de conta própria via payment_data classificado como TRANSFER
- **WHEN** uma transação tem `type = 'CREDIT'` e `payment_data.payer.accountNumber` é o número de uma conta em `accounts`
- **THEN** `transaction_kind = 'TRANSFER'`

#### Scenario: Débito para conta própria classificado como TRANSFER
- **WHEN** uma transação tem `type = 'DEBIT'` e `payment_data.receiver.accountNumber` é o número de uma conta em `accounts`
- **THEN** `transaction_kind = 'TRANSFER'`

#### Scenario: Pagamento de fatura bancário classificado como TRANSFER
- **WHEN** uma transação tem `type = 'DEBIT'`, conta é `BANK` e description contém "pagamento de fatura" ou "gastos cartao"
- **THEN** `transaction_kind = 'TRANSFER'`

#### Scenario: Recebimento de fatura no cartão classificado como TRANSFER
- **WHEN** uma transação tem `type = 'CREDIT'`, conta é `CREDIT` e description contém "pagamento" + "fatura" ou "inclusao pgto"
- **THEN** `transaction_kind = 'TRANSFER'`

#### Scenario: Débito de categoria conta própria classificado como TRANSFER
- **WHEN** uma transação tem `type = 'DEBIT'` e `category_group_pt = 'Transferência entre Próprias Contas'`
- **THEN** `transaction_kind = 'TRANSFER'`

#### Scenario: Crédito de categoria conta própria classificado como TRANSFER (NOVO)
- **WHEN** uma transação tem `type = 'CREDIT'` e `category_group_pt = 'Transferência entre Próprias Contas'` (mesmo sem peer_account_id)
- **THEN** `transaction_kind = 'TRANSFER'` e `is_real_cashflow = FALSE`

#### Scenario: Débito residual classificado como EXPENSE
- **WHEN** uma transação tem `type = 'DEBIT'` e não se enquadra em nenhuma regra anterior
- **THEN** `transaction_kind = 'EXPENSE'`

#### Scenario: Crédito residual classificado como INCOME
- **WHEN** uma transação tem `type = 'CREDIT'` e não se enquadra em nenhuma regra anterior
- **THEN** `transaction_kind = 'INCOME'`
