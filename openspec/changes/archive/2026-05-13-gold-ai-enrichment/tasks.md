## 1. Tabela ai_transaction_insights

- [x] 1.1 Criar arquivo `src/infrastructure/db/gold-ai.sql` com DDL de `ai_transaction_insights`
- [x] 1.2 Incluir campo `is_debt_related BOOLEAN` (decisão D5)
- [x] 1.3 Criar índice em `analyzed_at` para queries de auditoria
- [x] 1.4 Aplicar no banco: `psql finance < gold-ai.sql` e verificar que a tabela existe
- [x] 1.5 Verificar FK para `transactions_enriched.id` está ativa

## 2. Tabela ai_monthly_digest

- [x] 2.1 Adicionar DDL de `ai_monthly_digest` ao mesmo arquivo `gold-ai.sql`
- [x] 2.2 Incluir campos: `cashflow_real`, `debt_inflows`, `debt_payments`, `narrative_pt`, `structured_summary JSONB`, `flags TEXT[]`, `notable_expenses JSONB`, `enrichment_coverage`
- [x] 2.3 Aplicar no banco e verificar que a tabela existe com PRIMARY KEY `(year, month)`

## 3. Validação do schema

- [x] 3.1 Confirmar que `ai_transaction_insights` aceita INSERT manual de teste
- [x] 3.2 Confirmar que `ai_monthly_digest` aceita INSERT manual de teste
- [x] 3.3 Confirmar que ambas as tabelas são acessíveis sem erro
- [x] 3.4 Confirmar que nenhuma tabela bronze ou silver foi alterada
