## MODIFIED Requirements

### Requirement: enrich inclui seed de d_users
O processo de enrich deve garantir que `d_users` está populada antes do INSERT em `transactions_enriched`.

#### Scenario: enrich executado
- **WHEN** `enrichTransactions.enrich()` é chamado
- **THEN** antes do TRUNCATE/INSERT de `transactions_enriched`, executa INSERT de d_users a partir de identities
