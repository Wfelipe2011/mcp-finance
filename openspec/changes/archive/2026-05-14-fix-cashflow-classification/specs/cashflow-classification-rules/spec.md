## ADDED Requirements

### Requirement: CREDIT de conta própria por categoria classificado como TRANSFER
O sistema SHALL classificar como `TRANSFER` qualquer transação com `type = 'CREDIT'` cuja `category_group_pt` seja "Transferência entre Próprias Contas", independente de `peer_account_id` estar preenchido.

#### Scenario: PIX recebido de conta própria sem payment_data
- **WHEN** uma transação tem `type = 'CREDIT'` e `category_group_pt = 'Transferência entre Próprias Contas'` e `payment_data.payer.accountNumber` não cruza com nenhuma conta em `accounts`
- **THEN** `transaction_kind = 'TRANSFER'` e `is_real_cashflow = FALSE`

#### Scenario: PIX recebido de conta própria com payment_data (já era TRANSFER)
- **WHEN** uma transação tem `type = 'CREDIT'` e `category_group_pt = 'Transferência entre Próprias Contas'` e `payment_data.payer.accountNumber` cruza com uma conta em `accounts`
- **THEN** `transaction_kind = 'TRANSFER'` (comportamento inalterado)

#### Scenario: CREDIT com categoria "Transferências" genérica não é afetado
- **WHEN** uma transação tem `type = 'CREDIT'` e `category_group_pt = 'Transferências'` (não "Transferência entre Próprias Contas")
- **THEN** `transaction_kind` permanece determinado pelas regras anteriores (peer match ou INCOME)
