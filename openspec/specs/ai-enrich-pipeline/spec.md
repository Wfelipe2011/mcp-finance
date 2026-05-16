## ADDED Requirements

### Requirement: Pipeline enriquece transações via worker em background
O sistema SHALL processar transações via worker loop em background (processo Bun gerenciado pelo supervisor), não via script CLI. O worker SHALL buscar jobs da tabela `enrich_jobs` usando `nextJob()`, processar uma transação por vez chamando o modelo AI configurado nas env vars do processo, e persistir o resultado via `markDone()`. A ordenação SHALL ser `date DESC` (mais recente primeiro) com sorteio de tenant para fairness.

#### Scenario: Worker processa transação nova
- **WHEN** o worker está ativo e há jobs `pending` em `enrich_jobs`
- **THEN** o worker busca o job mais recente de um tenant sorteado, chama o modelo AI e persiste o resultado em `ai_transaction_insights`

#### Scenario: Worker está ativo sem jobs na fila
- **WHEN** não há jobs `pending` em `enrich_jobs`
- **THEN** o worker aguarda 5 segundos e tenta de novo, sem consumir recursos significativos

#### Scenario: Worker processa transações de múltiplos tenants
- **WHEN** múltiplos tenants têm jobs pendentes e N workers estão ativos
- **THEN** cada worker sorteia um tenant diferente a cada iteração, garantindo que todos os tenants progridam

### Requirement: Campo `is_debt_related` é sempre preenchido pelo modelo
O sistema SHALL incluir `is_debt_related` como campo obrigatório (não-nullable) no schema de saída do modelo. O prompt SHALL instruir explicitamente o modelo a detectar depósitos de empréstimo, amortizações e movimentações de dívida.

#### Scenario: Transação de empréstimo é marcada corretamente
- **WHEN** a description contém indicativos de empréstimo (ex: "Depósito de empréstimo", "Amortização")
- **THEN** `is_debt_related = true` na linha inserida em `ai_transaction_insights`

#### Scenario: Transação de consumo comum não é marcada como dívida
- **WHEN** a description é de um gasto ordinário (ex: "Supermercado Extra", "Netflix")
- **THEN** `is_debt_related = false` na linha inserida

#### Scenario: Log emitido após cada transação
- **WHEN** uma transação é processada com sucesso
- **THEN** o stdout exibe linha no formato `✓ [N/total] <description> → merchant=<name> debt=<bool>`

### Requirement: Erro do modelo não interrompe o pipeline inteiro
- **WHEN** o modelo retorna resposta inválida ou a chamada HTTP falha para uma transação
- **THEN** o script loga o erro para aquela transação, incrementa contador de erros, e continua para a próxima
- **THEN** ao final, exibe resumo com `processed_count` e `error_count`
