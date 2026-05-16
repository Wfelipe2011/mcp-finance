## ADDED Requirements

### Requirement: Classificação TRANSFER por categoria do Pluggy
Transações `DEBIT` cuja categoria do Pluggy é do grupo "Transferência entre Próprias Contas" devem ser classificadas como `TRANSFER`, mesmo sem `payment_data.accountNumber` resolvível.

#### Scenario: PIX interno sem accountNumber no payment_data
- **WHEN** transação é `type=DEBIT`, `category_group_pt='Transferência entre Próprias Contas'` e `peer_account_id IS NULL`
- **THEN** `transaction_kind = 'TRANSFER'` e `is_real_cashflow = false`

#### Scenario: Regras baseadas em operation_type têm prioridade
- **WHEN** transação é `RESGATE_APLIC_FINANCEIRA` e também está categorizada como "Transferência"
- **THEN** `transaction_kind = 'INVEST'` (regra de operation_type prevalece)

### Requirement: Classificação INVEST para aportes por categoria do Pluggy
Transações `DEBIT` cuja categoria do Pluggy é do grupo "Investimentos" e não foram capturadas pelas regras de `operation_type` devem ser classificadas como `INVEST`.

#### Scenario: Aporte em carteira (Cofrinho, Digio, etc.)
- **WHEN** transação é `type=DEBIT`, `category_group_pt='Investimentos'` e `operation_type` não é `RESGATE_APLIC_FINANCEIRA`
- **THEN** `transaction_kind = 'INVEST'` e `is_real_cashflow = false`

#### Scenario: Aportes não aparecem em cube_gastos_mensais
- **WHEN** `enrichTransactions.enrich()` é executado
- **THEN** aportes em investimentos não aparecem como EXPENSE em `cube_gastos_mensais` nem em `cube_cashflow_mensal.total_despesas`
