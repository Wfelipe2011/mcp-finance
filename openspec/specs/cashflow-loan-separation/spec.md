## ADDED Requirements

### Requirement: Separação de empréstimos na receita do cube
O `cube_cashflow_mensal` deve expor `total_emprestimos` (soma de INCOME com `operation_type=OPERACAO_CREDITO`) e `total_receitas_operacionais` (receita sem empréstimos).

#### Scenario: Mês com depósito de empréstimo
- **WHEN** mês possui transações INCOME com `operation_type = 'OPERACAO_CREDITO'`
- **THEN** `total_emprestimos > 0` e `total_receitas_operacionais = total_receitas - total_emprestimos`

#### Scenario: Mês sem empréstimos
- **WHEN** mês não possui OPERACAO_CREDITO
- **THEN** `total_emprestimos = 0` e `total_receitas_operacionais = total_receitas`

### Requirement: UI exibe receita operacional como valor principal
O card "Receitas" no Resumo deve mostrar `total_receitas_operacionais` como valor principal, com indicação visual separada quando `total_emprestimos > 0`.

#### Scenario: Fevereiro 2026 com R$58.000 em empréstimos
- **WHEN** usuário seleciona Fev/2026 no Resumo
- **THEN** card de Receitas exibe ~R$47.000 (operacional) com badge indicando R$58.000 em empréstimos separado
