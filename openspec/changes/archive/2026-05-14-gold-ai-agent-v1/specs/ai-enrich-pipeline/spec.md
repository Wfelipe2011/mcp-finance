## ADDED Requirements

### Requirement: Pipeline enriquece transações não-analisadas uma por chamada
O sistema SHALL selecionar transações presentes em `f_transacoes` mas ausentes em `ai_transaction_insights`, invocar o modelo uma vez por transação, e persistir o resultado em `ai_transaction_insights`. O processamento SHALL respeitar o parâmetro `--limit` (padrão: 50) e processar na ordem cronológica crescente (`date_day ASC`).

#### Scenario: Transação nova é enriquecida e persistida
- **WHEN** `bun run enrich --limit 1` é executado e existe ao menos uma transação não-analisada
- **THEN** uma linha é inserida em `ai_transaction_insights` com `transaction_id`, `model_version` e `analyzed_at` não-nulos

#### Scenario: Pipeline respeita o limite
- **WHEN** `bun run enrich --limit 10` é executado e existem 100 transações não-analisadas
- **THEN** exatamente 10 transações são processadas nessa execução

#### Scenario: Pipeline é idempotente
- **WHEN** `bun run enrich` é executado duas vezes consecutivas sem novas transações
- **THEN** a segunda execução processa 0 transações e não altera registros existentes

### Requirement: Campo `is_debt_related` é sempre preenchido pelo modelo
O sistema SHALL incluir `is_debt_related` como campo obrigatório (não-nullable) no schema de saída do modelo. O prompt SHALL instruir explicitamente o modelo a detectar depósitos de empréstimo, amortizações e movimentações de dívida.

#### Scenario: Transação de empréstimo é marcada corretamente
- **WHEN** a description contém indicativos de empréstimo (ex: "Depósito de empréstimo", "Amortização")
- **THEN** `is_debt_related = true` na linha inserida em `ai_transaction_insights`

#### Scenario: Transação de consumo comum não é marcada como dívida
- **WHEN** a description é de um gasto ordinário (ex: "Supermercado Extra", "Netflix")
- **THEN** `is_debt_related = false` na linha inserida

### Requirement: Script loga progresso em tempo real
O sistema SHALL emitir uma linha de log por transação processada indicando o índice, a description original, o `merchant_name` extraído e `is_debt_related`.

#### Scenario: Log emitido após cada transação
- **WHEN** uma transação é processada com sucesso
- **THEN** o stdout exibe linha no formato `✓ [N/total] <description> → merchant=<name> debt=<bool>`

### Requirement: Erro do modelo não interrompe o pipeline inteiro
- **WHEN** o modelo retorna resposta inválida ou a chamada HTTP falha para uma transação
- **THEN** o script loga o erro para aquela transação, incrementa contador de erros, e continua para a próxima
- **THEN** ao final, exibe resumo com `processed_count` e `error_count`
