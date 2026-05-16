## Context

O schema gold-AI (`ai_transaction_insights` + `ai_monthly_digest`) existe no PostgreSQL desde a change `gold-ai-enrichment`. As tabelas estão vazias e prontas para receber dados. O `mcp-finance` já tem `BunPgAdapter` com padrão consolidado de repositories, e `src/scripts/sync.ts` como referência de script de entrada. O `small-agent` (projeto paralelo em `~/workspace/small-agent`) demonstra o padrão LangChain com o mesmo modelo e servidor — usamos ele como referência de arquitetura, mas não como dependência.

O servidor de modelo roda em `192.168.0.209:8080`, é 100% compatível com a API OpenAI, suporta `json_schema`, `tool_calls` e `withStructuredOutput`. O modelo é `gemma-4`.

---

## Goals / Non-Goals

**Goals:**
- Implementar pipeline de enrichment linha a linha (`enrich.ts`)
- Implementar pipeline de digest mensal (`digest.ts`)
- Abstrair o modelo via `model.ts` configurado por env vars
- Seguir o padrão do `BunPgAdapter` para novos métodos de persistência
- Scripts invocáveis por terminal (trigger manual)

**Non-Goals:**
- MCP tools expostas via MCP server (change futura)
- Automação pós-sync (pode ser adicionada depois)
- Avaliação de qualidade do modelo ou comparação de modelos
- Processamento em paralelo (sequencial é suficiente para o volume)

---

## Decisions

**D1: Uma transação por chamada ao modelo (não batch)**

O enriquecimento faz uma chamada por transação, não batch de N. Razões:
- Schema Zod simples (`TransactionInsightSchema`) é mais fácil de validar
- Retry granular: falha em 1 transação não retransmite 50
- O modelo retorna um único objeto JSON, sem risco de misturar campos entre transações
- Gemma 4 tem latência aceitável para processamento offline não-interativo
- Custo: ~3295 chamadas na primeira execução full — processamento de fundo, não em tempo real

**D2: `@langchain/openai` + `zod` — sem LangGraph**

O pipeline é linear (sem loop de agente, sem memória, sem ferramentas encadeadas). LangGraph não é necessário. Adicionamos apenas:
- `@langchain/openai`: fornece `ChatOpenAI` + `withStructuredOutput`
- `zod`: schemas de validação e geração de JSON Schema para o modelo

`withStructuredOutput(zodSchema)` usa `tool_calls` internamente — o modelo retorna JSON validado pelo Zod automaticamente, com retry nativo.

**D3: Modelo configurado por env vars, não hardcoded**

```
AI_BASE_URL=http://192.168.0.209:8080/v1
AI_MODEL=gemma-4
```

Segue o padrão do `DATABASE_URL` no `BunPgAdapter`. Troca de modelo ou servidor = só mudar o `.env`.

**D4: Novos métodos no `BunPgAdapter` (não adapters separados)**

O padrão existente coloca todos os repositories dentro do `BunPgAdapter`. Adicionamos dois novos:
- `db.aiInsights`: `getUnenriched(limit)` + `upsertOne(row)`
- `db.aiDigests`: `getMonthInsights(year, month)` + `upsert(row)`

Alternativa considerada: adapters separados (`AiInsightsAdapter`, `AiDigestsAdapter`) — rejeitada por over-engineering para dois métodos cada.

**D5: `enrich.ts` processa do mais antigo para o mais recente**

`ORDER BY date_day ASC` nas transações não-enriquecidas. Garante que o histórico cronológico fica completo antes de chegar no presente. Interrompível a qualquer ponto (idempotente via `ON CONFLICT DO UPDATE`).

**D6: `digest.ts` exige que enrichment já tenha rodado — sem fallback**

O digest lê `ai_transaction_insights` para o mês solicitado. Se `enrichment_coverage` for baixo (< 50% das transações do mês), o script emite aviso mas não bloqueia. A decisão de rodar o digest com cobertura parcial é do usuário.

---

## Arquitetura dos pipelines

```
enrich.ts
──────────────────────────────────────────────────────────
bun run enrich [--limit 100]
      │
      ▼
db.aiInsights.getUnenriched(limit)
      │  SELECT t.id, t.description, t.amount_signed, t.type, ...
      │  FROM f_transacoes t
      │  WHERE NOT EXISTS (SELECT 1 FROM ai_transaction_insights WHERE transaction_id = t.id)
      │  ORDER BY t.date_day ASC
      │  LIMIT limit
      │
      ▼ para cada transação:
model.withStructuredOutput(TransactionInsightSchema).invoke(prompt)
      │  prompt: description + amount + category + type
      │  output: { merchant_name, is_debt_related, is_recurring, ... }
      │
      ▼
db.aiInsights.upsertOne({ transaction_id, ...insight, model_version })
      │  INSERT INTO ai_transaction_insights (...) ON CONFLICT DO UPDATE SET ...
      ▼
log: "✓ [123/500] Netflix R$45.90 → merchant_name=Netflix is_recurring=true"

digest.ts
──────────────────────────────────────────────────────────
bun run digest --month 2026-02
      │
      ▼
db.aiInsights.getMonthInsights(2026, 2)
      │  SELECT ai.*, t.amount_signed, t.type
      │  FROM ai_transaction_insights ai
      │  JOIN f_transacoes t ON t.id = ai.transaction_id
      │  WHERE EXTRACT(YEAR FROM t.date_day) = 2026
      │    AND EXTRACT(MONTH FROM t.date_day) = 2
      │
      ▼
Agrega métricas localmente (sem LLM):
  cashflow_real  = SUM(amount_signed WHERE NOT is_debt_related)
  debt_inflows   = SUM(amount_signed WHERE is_debt_related AND type = 'INCOME')
  debt_payments  = SUM(amount_signed WHERE is_debt_related AND type = 'EXPENSE')
  enrichment_coverage = COUNT(insights) / COUNT(total_tx_no_mes)
      │
      ▼
model.withStructuredOutput(MonthlyDigestSchema).invoke(prompt)
      │  prompt: métricas + lista de transações notáveis
      │  output: { narrative_pt, structured_summary, flags, notable_expenses }
      │
      ▼
db.aiDigests.upsert({ year, month, cashflow_real, ..., model_version, digest_at })
      │  INSERT INTO ai_monthly_digest (...) ON CONFLICT (year, month) DO UPDATE SET ...
      ▼
log: "✓ Digest 2026-02 gerado | cashflow_real=-2.4k | coverage=87%"
```

---

## Schemas Zod

```
TransactionInsightSchema:
  merchant_name:     string | null
  merchant_country:  string | null          // "BR", "US"
  is_recurring:      boolean | null
  recurrence_period: "monthly"|"annual"|"unknown" | null
  expense_context:   "personal"|"work"|"shared"|"debt" | null
  is_debt_related:   boolean                // não nullable — campo crítico
  anomaly_score:     number (0-1) | null
  tags:              string[]
  category_hint:     string | null

MonthlyDigestSchema:
  narrative_pt:        string               // parágrafo em português
  structured_summary:  object (livre)       // JSON para o agente LLM
  flags:               string[]             // ["emprestimo_detectado", ...]
  notable_expenses:    array de { description, amount, reason }
```

---

## Risks / Trade-offs

- **Latência por transação** → 3295 chamadas na primeira execução full. Em ~2s/chamada: ~110 minutos. Mitigação: `--limit` permite processar em partes; idempotente, pode ser retomado.
- **Qualidade do `is_debt_related`** → Campo crítico. Se o modelo errar, `cashflow_real` será calculado incorretamente. Mitigação: `raw_response` salvo para auditoria; logs permitem revisão manual.
- **Servidor de modelo offline** → `fetch` para `AI_BASE_URL` vai falhar com erro de rede. Mitigação: script termina com erro claro (sem retry infinito).
- **Cobertura parcial no digest** → Se enrich rodou só em parte do mês, `enrichment_coverage < 100%`. Mitigação: aviso no log, campo salvo na tabela para o usuário ver.

---

## Open Questions

- Qual `--limit` padrão é mais prático para sessões cotidianas? (sugestão: 50)
- Vale adicionar `--dry-run` ao `enrich.ts` para testar qualidade antes de persistir?
