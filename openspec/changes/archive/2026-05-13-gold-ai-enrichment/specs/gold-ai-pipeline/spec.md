## ADDED Requirements

### Requirement: Pipeline de enrichment processa transações não-analisadas em batches via Ollama
O sistema SHALL implementar função de enrichment que: (1) seleciona até N transações de `f_transacoes` não presentes em `ai_transaction_insights`, (2) envia batch para Ollama API em `localhost:11434` com modelo `gemma3:4b`, (3) parseia resposta JSON estruturada, (4) insere resultados em `ai_transaction_insights`.

O prompt SHALL solicitar extração de: `merchant_name`, `is_recurring`, `expense_context`, `tags`, `anomaly_score`. A resposta do modelo SHALL ser JSON válido sem markdown.

#### Scenario: Batch de transações é processado com sucesso
- **WHEN** `enrich_transactions(limit=10)` é chamado com Ollama disponível
- **THEN** até 10 linhas são inseridas em `ai_transaction_insights`
- **THEN** `model_version = 'gemma3:4b'` em todas as linhas inseridas

#### Scenario: Ollama indisponível retorna erro descritivo
- **WHEN** `enrich_transactions` é chamado com Ollama offline
- **THEN** a função retorna erro indicando que Ollama não está disponível em `localhost:11434`

#### Scenario: JSON inválido do modelo é tratado com fallback
- **WHEN** o modelo retorna resposta que não é JSON válido
- **THEN** `raw_response` armazena a resposta original e os campos estruturados ficam NULL (sem lançar exceção)
