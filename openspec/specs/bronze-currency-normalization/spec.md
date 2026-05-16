### Requirement: amount em transactions_enriched é sempre BRL
A coluna `amount` em `transactions_enriched` SHALL representar o valor em reais (BRL) para todas as linhas, independente da moeda original da transação em `transactions`.

#### Scenario: Transação nativa BRL
- **WHEN** uma transação em `transactions` tem `currency_code = 'BRL'`
- **THEN** `transactions_enriched.amount` SHALL ser igual a `transactions.amount`

#### Scenario: Transação em moeda estrangeira com valor BRL disponível
- **WHEN** uma transação em `transactions` tem `currency_code != 'BRL'` e `amount_in_account_currency IS NOT NULL`
- **THEN** `transactions_enriched.amount` SHALL ser igual a `transactions.amount_in_account_currency`

#### Scenario: Transação em moeda estrangeira sem valor BRL
- **WHEN** uma transação em `transactions` tem `currency_code != 'BRL'` e `amount_in_account_currency IS NULL`
- **THEN** `transactions_enriched.amount` SHALL usar `transactions.amount` como fallback (aproximação aceitável para valores de centavos)

### Requirement: currency_code em transactions_enriched é sempre BRL
A coluna `currency_code` em `transactions_enriched` SHALL ser sempre a literal `'BRL'`, independente da moeda original em `transactions`.

#### Scenario: Moeda normalizada para BRL
- **WHEN** qualquer transação é inserida em `transactions_enriched`
- **THEN** `transactions_enriched.currency_code` SHALL ser `'BRL'`

### Requirement: amount_in_account_currency ausente no bronze
A coluna `amount_in_account_currency` NÃO SHALL existir em `transactions_enriched`. O valor original em moeda estrangeira permanece disponível em `transactions.amount` e `transactions.amount_in_account_currency`.

#### Scenario: Schema sem a coluna
- **WHEN** o schema de `transactions_enriched` é inspecionado via `\d transactions_enriched`
- **THEN** a coluna `amount_in_account_currency` NÃO SHALL aparecer

### Requirement: Contagens preservadas após normalização
A normalização de moeda NÃO SHALL alterar a cardinalidade da tabela.

#### Scenario: Total de linhas após sync
- **WHEN** `bun run sync` é executado com o novo schema
- **THEN** `SELECT COUNT(*) FROM transactions_enriched` SHALL ser igual a `SELECT COUNT(*) FROM transactions`
