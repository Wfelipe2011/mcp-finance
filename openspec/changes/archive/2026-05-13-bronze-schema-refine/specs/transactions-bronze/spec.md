## ADDED Requirements

### Requirement: Coluna owner_normalized na camada bronze
A tabela `transactions_enriched` SHALL conter uma coluna `owner_normalized TEXT NOT NULL` que representa o `owner` da conta associada normalizado via `LOWER(TRIM())`, resolvendo variações de capitalização e espaços vindas do Pluggy.

#### Scenario: Agrupamento por membro da família
- **WHEN** uma query agrupa por `owner_normalized`
- **THEN** todas as transações de Wilson resultam em exatamente 1 valor (`'wilson felipe da silva'`) e todas as de Giulia em exatamente 1 valor (`'giulia cristina rodrigues de souza'`)

#### Scenario: Novo membro com grafia diferente
- **WHEN** um novo item é adicionado ao Pluggy com owner `'GIULIA C R DE SOUZA'`
- **THEN** `owner_normalized` recebe `'giulia c r de souza'` (normalizado), sem quebrar o pipeline

### Requirement: Colunas de ruído de integração removidas da camada bronze
A tabela `transactions_enriched` SHALL NOT conter as seguintes colunas presentes em `transactions`: `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `created_at`, `updated_at`, `synced_at`, `payment_data`. Estas colunas permanecem intactas na tabela `transactions` (raw).

#### Scenario: Consulta analítica sem ruído
- **WHEN** um agente ou query consulta `transactions_enriched`
- **THEN** apenas colunas com valor analítico são expostas — sem JSON bruto de `payment_data`, sem metadados de sync, sem colunas com 0% de preenchimento

#### Scenario: Integridade da camada raw
- **WHEN** as colunas são removidas de `transactions_enriched`
- **THEN** `transactions` permanece com todas as colunas originais intactas, incluindo `payment_data` e `balance`
