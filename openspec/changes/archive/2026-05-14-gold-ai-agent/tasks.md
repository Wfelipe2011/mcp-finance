## 1. Dependências e configuração

- [x] 1.1 Adicionar `@langchain/openai` e `zod` ao `package.json` do mcp-finance (`bun add`)
- [x] 1.2 Adicionar `AI_BASE_URL` e `AI_MODEL` ao `.env.example`
- [x] 1.3 Confirmar que `bun install` resolve sem erros

## 2. Model adapter

- [x] 2.1 Criar `src/infrastructure/ai/model.ts` lendo `AI_BASE_URL` e `AI_MODEL` de env vars
- [x] 2.2 Lançar erro descritivo se qualquer env var estiver ausente
- [x] 2.3 Exportar instância `ChatOpenAI` pronta para `withStructuredOutput`

## 3. Schemas Zod

- [x] 3.1 Criar `src/infrastructure/ai/schemas/TransactionInsightSchema.ts` com todos os campos (incluindo `is_debt_related` como não-nullable)
- [x] 3.2 Criar `src/infrastructure/ai/schemas/MonthlyDigestSchema.ts` com `narrative_pt`, `structured_summary`, `flags`, `notable_expenses`

## 4. Pipeline de enrichment

- [x] 4.1 Adicionar `db.aiInsights` ao `BunPgAdapter`: método `getUnenriched(limit: number)` com SELECT em `f_transacoes` + NOT EXISTS em `ai_transaction_insights` ORDER BY `date_day ASC`
- [x] 4.2 Adicionar método `upsertOne(row)` ao `db.aiInsights` com INSERT/ON CONFLICT DO UPDATE em `ai_transaction_insights`
- [x] 4.3 Criar `src/infrastructure/ai/enrichAgent.ts`: monta prompt com description, amount, type e category da transação, chama `model.withStructuredOutput(TransactionInsightSchema)`
- [x] 4.4 Criar `src/scripts/enrich.ts`: lê `--limit` dos args (default 50), loop sobre `getUnenriched`, chama enrichAgent, upserta, loga `✓ [N/total] description → merchant=X debt=Y`
- [x] 4.5 Tratar erro por transação: logar e continuar (não interromper pipeline)
- [x] 4.6 Exibir resumo final com `processed_count` e `error_count`
- [x] 4.7 Adicionar `"enrich": "bun run src/scripts/enrich.ts"` ao `package.json`

## 5. Pipeline de digest

- [x] 5.1 Adicionar `db.aiDigests` ao `BunPgAdapter`: método `getMonthInsights(year, month)` com JOIN entre `ai_transaction_insights` e `f_transacoes`
- [x] 5.2 Adicionar método `upsert(row)` ao `db.aiDigests` com INSERT/ON CONFLICT (year, month) DO UPDATE em `ai_monthly_digest`
- [x] 5.3 Criar `src/infrastructure/ai/digestAgent.ts`: recebe métricas pré-calculadas + lista de transações, monta prompt narrativo, chama `model.withStructuredOutput(MonthlyDigestSchema)`
- [x] 5.4 Criar `src/scripts/digest.ts`: valida `--month YYYY-MM` (encerra com mensagem se ausente), calcula `cashflow_real` / `debt_inflows` / `debt_payments` / `enrichment_coverage` localmente
- [x] 5.5 Emitir aviso se `enrichment_coverage < 0.5` antes de chamar o modelo
- [x] 5.6 Chamar digestAgent, upsertir resultado, logar `✓ Digest YYYY-MM | cashflow_real=X | coverage=Y%`
- [x] 5.7 Adicionar `"digest": "bun run src/scripts/digest.ts"` ao `package.json`

## 6. Validação end-to-end

- [x] 6.1 Executar `bun run enrich --limit 5` e confirmar 5 linhas em `ai_transaction_insights`
- [x] 6.2 Verificar que `is_debt_related` está preenchido (não nulo) em todas as linhas
- [x] 6.3 Confirmar idempotência: rodar enrich novamente e verificar que `processed_count = 0`
- [x] 6.4 Executar `bun run digest --month <mês com dados>` e confirmar linha em `ai_monthly_digest`
- [x] 6.5 Verificar que `narrative_pt` não é nulo e `cashflow_real` está calculado
- [x] 6.6 Confirmar que nenhuma tabela bronze/silver/gold foi alterada
