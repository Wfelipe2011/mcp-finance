## ADDED Requirements

### Requirement: MCP tool enrich_transactions dispara o pipeline sob demanda
O sistema SHALL expor MCP tool `enrich_transactions` com parâmetro opcional `limit` (INT, default 50, máximo 200). A tool SHALL retornar: número de transações processadas, número de erros, e lista de `transaction_id` processados.

#### Scenario: Tool chamada sem parâmetros usa default de 50
- **WHEN** `enrich_transactions()` é chamado sem argumentos
- **THEN** o pipeline processa no máximo 50 transações não-analisadas

#### Scenario: Tool retorna sumário do processamento
- **WHEN** `enrich_transactions(limit=10)` completa com sucesso
- **THEN** a resposta inclui `processed_count`, `error_count` e `transaction_ids`
