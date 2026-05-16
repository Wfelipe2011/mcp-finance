## ADDED Requirements

### Requirement: View d_conta expõe contas enriquecidas com banco inferido
O sistema SHALL criar uma view `d_conta` sobre `accounts JOIN items` expondo: `account_id` (TEXT, PK da conta), `nome` (TEXT, `accounts.name`), `tipo` (TEXT, `accounts.type`), `subtipo` (TEXT, `accounts.subtype`), `banco` (TEXT, derivado de `items.connector`), `dono` (TEXT, `accounts.owner` normalizado em lowercase), `limite_credito` (NUMERIC, `cc_credit_limit`), `moeda` (TEXT, `currency_code`).

#### Scenario: Conta bancária aparece com banco correto
- **WHEN** `d_conta` é consultada para uma conta do tipo `BANK`
- **THEN** a coluna `banco` reflete o conector Pluggy associado ao item (ex: `'NUBANK'`, `'INTER'`)

#### Scenario: Cartão de crédito expõe limite
- **WHEN** `d_conta` é consultada para uma conta do tipo `CREDIT`
- **THEN** `limite_credito` é não-nulo e maior que zero

#### Scenario: Todas as contas ativas aparecem
- **WHEN** `d_conta` é consultada sem filtros
- **THEN** o número de linhas é igual ao número de linhas em `accounts`
