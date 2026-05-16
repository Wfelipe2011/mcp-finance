### Requirement: Tabela transactions_enriched existe no banco
O sistema SHALL manter uma tabela `transactions_enriched` no PostgreSQL que contém todas as colunas analiticamente úteis de `transactions` acrescidas de `transaction_kind`, `peer_account_id`, `is_real_cashflow` e `owner_normalized`.

#### Scenario: Tabela criada pelo schema
- **WHEN** o banco é inicializado via schema.sql
- **THEN** a tabela `transactions_enriched` existe com as colunas de `transactions` (excluindo colunas de ruído) + as 4 colunas de enriquecimento

#### Scenario: Contagem consistente com transactions
- **WHEN** o sync é executado com sucesso
- **THEN** `SELECT COUNT(*) FROM transactions_enriched` retorna o mesmo valor que `SELECT COUNT(*) FROM transactions`

---

### Requirement: Classificação transaction_kind
O sistema SHALL classificar cada transação em exatamente um de: `EXPENSE`, `INCOME`, `TRANSFER`, `INVEST`, de acordo com a lógica de prioridade definida.

#### Scenario: Aporte/resgate de investimento classificado como INVEST
- **WHEN** uma transação tem `operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')`
- **THEN** `transaction_kind = 'INVEST'`

#### Scenario: Crédito de conta própria classificado como TRANSFER
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

#### Scenario: Débito residual classificado como EXPENSE
- **WHEN** uma transação tem `type = 'DEBIT'` e não se enquadra em nenhuma regra anterior
- **THEN** `transaction_kind = 'EXPENSE'`

#### Scenario: Crédito residual classificado como INCOME
- **WHEN** uma transação tem `type = 'CREDIT'` e não se enquadra em nenhuma regra anterior
- **THEN** `transaction_kind = 'INCOME'`

---

### Requirement: Campo peer_account_id preenchido em transferências
O sistema SHALL preencher `peer_account_id` com o `accounts.id` da conta de origem/destino quando a transação for classificada como `TRANSFER` e o número da conta peer estiver disponível em `payment_data`.

#### Scenario: TRANSFER com peer identificável
- **WHEN** `transaction_kind = 'TRANSFER'` e o número de conta em `payment_data` cruza com `accounts.number`
- **THEN** `peer_account_id` contém o `id` da conta correspondente em `accounts`

#### Scenario: TRANSFER sem peer identificável
- **WHEN** `transaction_kind = 'TRANSFER'` mas não há `payment_data` ou o número não está em `accounts` (ex: fatura de cartão detectada por texto)
- **THEN** `peer_account_id = NULL`

#### Scenario: Não-TRANSFER tem peer nulo
- **WHEN** `transaction_kind` é `EXPENSE`, `INCOME` ou `INVEST`
- **THEN** `peer_account_id = NULL`

---

### Requirement: Campo is_real_cashflow como atalho analítico
O sistema SHALL preencher `is_real_cashflow = TRUE` para transações classificadas como `EXPENSE` ou `INCOME`, e `FALSE` para `TRANSFER` ou `INVEST`.

#### Scenario: EXPENSE e INCOME são fluxo real
- **WHEN** `transaction_kind IN ('EXPENSE', 'INCOME')`
- **THEN** `is_real_cashflow = TRUE`

#### Scenario: TRANSFER e INVEST não são fluxo real
- **WHEN** `transaction_kind IN ('TRANSFER', 'INVEST')`
- **THEN** `is_real_cashflow = FALSE`

---

### Requirement: Coluna owner_normalized na camada bronze
A tabela `transactions_enriched` SHALL conter uma coluna `owner_normalized TEXT NOT NULL` que representa o `owner` da conta associada normalizado via `LOWER(TRIM())`, resolvendo variações de capitalização e espaços vindas do Pluggy.

#### Scenario: Agrupamento por membro da família
- **WHEN** uma query agrupa por `owner_normalized`
- **THEN** todas as transações de Wilson resultam em exatamente 1 valor (`'wilson felipe da silva'`) e todas as de Giulia em exatamente 1 valor (`'giulia cristina rodrigues de souza'`)

#### Scenario: Novo membro com grafia diferente
- **WHEN** um novo item é adicionado ao Pluggy com owner `'GIULIA C R DE SOUZA'`
- **THEN** `owner_normalized` recebe `'giulia c r de souza'` (normalizado), sem quebrar o pipeline

---

### Requirement: Colunas de ruído de integração removidas da camada bronze
A tabela `transactions_enriched` SHALL NOT conter as seguintes colunas presentes em `transactions`: `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `created_at`, `updated_at`, `synced_at`, `payment_data`. Estas colunas permanecem intactas na tabela `transactions` (raw).

#### Scenario: Consulta analítica sem ruído
- **WHEN** um agente ou query consulta `transactions_enriched`
- **THEN** apenas colunas com valor analítico são expostas — sem JSON bruto de `payment_data`, sem metadados de sync, sem colunas com 0% de preenchimento

#### Scenario: Integridade da camada raw
- **WHEN** as colunas são removidas de `transactions_enriched`
- **THEN** `transactions` permanece com todas as colunas originais intactas, incluindo `payment_data` e `balance`

---

### Requirement: Enriquecimento executado após cada sync
O sistema SHALL popular `transactions_enriched` como etapa final do `SyncUseCase.run()`, após todas as demais etapas de sync serem concluídas com sucesso.

#### Scenario: Sync bem-sucedido popula a tabela
- **WHEN** `bun run sync` conclui sem erros
- **THEN** `transactions_enriched` contém dados atualizados com base no estado atual de `transactions` e `accounts`

#### Scenario: Atomicidade na população
- **WHEN** o enriquecimento é executado
- **THEN** a tabela é truncada e repopulada dentro de uma única transação SQL, nunca ficando em estado parcial
