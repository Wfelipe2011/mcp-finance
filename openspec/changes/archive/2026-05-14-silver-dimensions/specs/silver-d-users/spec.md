## ADDED Requirements

### Requirement: Tabela d_users existe com surrogate key inteira
O sistema SHALL manter uma tabela `d_users` com as colunas `id` (SERIAL PRIMARY KEY), `name` (TEXT, valor de `owner_normalized`), e `display_name` (TEXT, nome curto para exibição). A tabela SHALL ser populada via seed SQL com os membros da família.

#### Scenario: Seed popula membros da família
- **WHEN** o script de seed é executado
- **THEN** a tabela `d_users` contém uma linha para `wilson felipe da silva` com `display_name = 'Wilson'`
- **THEN** a tabela `d_users` contém uma linha para `giulia cristina rodrigues de souza` com `display_name = 'Giulia'`

#### Scenario: Join com transactions_enriched via owner_normalized
- **WHEN** `d_users.name` é comparado com `transactions_enriched.owner_normalized`
- **THEN** todas as transações com `owner_normalized` não-nulo encontram exatamente um registro em `d_users`
