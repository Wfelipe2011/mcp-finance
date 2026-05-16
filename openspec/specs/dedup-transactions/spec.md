## ADDED Requirements

### Requirement: Deduplicação por fingerprint de transação
A camada silver deve deduplicar transações com mesmo `(account_id, date_day, abs_amount, type)` antes de calcular `transaction_kind`, preservando o registro com `updated_at` mais recente.

#### Scenario: Pluggy emite dois IDs para o mesmo evento
- **WHEN** duas transações possuem mesmo `account_id`, mesma `date::date`, mesmo `ABS(amount)` e mesmo `type`, ambas com status `POSTED`
- **THEN** apenas a transação com maior `updated_at` aparece em `transactions_enriched`

#### Scenario: Dois pagamentos iguais no mesmo dia (legítimos)
- **WHEN** duas transações possuem mesmo fingerprint mas são legitimamente diferentes (ex: dois pagamentos de R$100 na mesma conta no mesmo dia)
- **THEN** apenas um é mantido (trade-off aceitável, documentado)

#### Scenario: Enriquecimento re-executado
- **WHEN** `enrichTransactions.enrich()` é chamado novamente
- **THEN** `transactions_enriched` contém o mesmo conjunto deduplicado (operação idempotente)
