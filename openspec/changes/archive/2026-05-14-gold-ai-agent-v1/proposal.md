## Why

O schema gold-AI (`ai_transaction_insights` + `ai_monthly_digest`) foi criado mas está vazio — não há pipeline para populá-lo. Esta change implementa os dois scripts de enrichment que consomem o modelo Gemma 4 via API OpenAI-compatible para enriquecer transações linha a linha e gerar narrativas mensais, tornando as tabelas gold-AI funcionais.

## What Changes

- Adiciona `@langchain/openai` e `zod` como dependências de runtime ao `mcp-finance`
- Cria `src/infrastructure/ai/model.ts` — instância `ChatOpenAI` apontando para `AI_BASE_URL` via env var
- Cria schemas Zod para `TransactionInsight` e `MonthlyDigest` (contrato entre pipeline e banco)
- Cria `src/infrastructure/ai/enrichAgent.ts` — enriquece uma transação por chamada via `withStructuredOutput`
- Cria `src/infrastructure/ai/digestAgent.ts` — gera narrativa de mês completo via `withStructuredOutput`
- Cria `src/scripts/enrich.ts` — script invocável com `bun run enrich [--limit N]`
- Cria `src/scripts/digest.ts` — script invocável com `bun run digest --month YYYY-MM`
- Adiciona métodos de AI ao `BunPgAdapter` (leitura de transações não-enriquecidas, upsert de insights e digests)
- Adiciona `AI_BASE_URL` e `AI_MODEL` ao `.env.example`

## Capabilities

### New Capabilities

- `ai-enrich-pipeline`: Pipeline de enrichment semântico — lê transações não-analisadas, chama o modelo uma por vez, persiste `TransactionInsight` em `ai_transaction_insights`
- `ai-digest-pipeline`: Pipeline de digest mensal — lê `ai_transaction_insights` de um mês, agrega métricas, chama o modelo para narrativa, persiste `MonthlyDigest` em `ai_monthly_digest`
- `ai-model-adapter`: Abstração do modelo LLM (`ChatOpenAI` + `withStructuredOutput`) configurada por env vars `AI_BASE_URL` e `AI_MODEL`

### Modified Capabilities

<!-- nenhuma — as tabelas gold-AI são novas, nenhum spec existente é alterado -->

## Impact

- **Novas dependências**: `@langchain/openai` + `zod` entram no `package.json`
- **Env vars novas**: `AI_BASE_URL=http://192.168.0.177:8080/v1`, `AI_MODEL=gemma-4`
- **Sem alterações em bronze/silver/gold**: apenas escrita nas tabelas `ai_transaction_insights` e `ai_monthly_digest` já criadas
- **Sem MCP server ainda**: os scripts são executados manualmente via terminal (MCP tools ficam para change futura)
