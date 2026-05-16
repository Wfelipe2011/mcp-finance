## Context

### O que o mercado está fazendo (Discovery)

LLM enrichment de transações financeiras é um padrão emergente. Os casos de uso mais comuns:

**1. Merchant normalization**
Bancos entregam descriptions caóticas: `"PG *NFLX 11/24 Los Angeles CA"` → o LLM extrai `"Netflix"`. Empresas como Plaid, Stripe e Yodlee fazem isso em escala. Localmente, o Gemma 3 4B consegue fazer isso de forma confiável para transações em português.

**2. Categorização semântica (override inteligente)**
Quando a categoria da Pluggy é genérica (`"Outros"`), o LLM lê a description e sugere uma categoria mais específica. É um reforço ao sistema de `category_overrides` que já temos.

**3. Detecção de recorrência**
Assinaturas (Netflix, AWS, Spotify) aparecem todo mês com valores similares. O LLM, olhando para o histórico de um merchant, detecta o padrão e marca `is_recurring = true`.

**4. Scoring de anomalia**
"Esse gasto parece fora do padrão?" — o LLM analisa o histórico médio daquela categoria e pontua a transação. Não é ML clássico, é raciocínio semântico.

**5. Tagging semântico**
Tags livres: `['trabalho', 'tech', 'assinatura', 'anual']`. Permitem filtros ad-hoc nas queries analíticas que não eram possíveis com categorias fixas.

---

### Por que Gemma 3 local?

```
┌─────────────────────────────────────────────────────────┐
│  Alternativas comparadas                                │
├──────────────┬──────────────────────────┬───────────────┤
│  Opção       │  Prós                    │  Contras      │
├──────────────┼──────────────────────────┼───────────────┤
│  GPT-4o API  │  melhor qualidade        │  custo/token  │
│              │                          │  dados saem   │
├──────────────┼──────────────────────────┼───────────────┤
│  Gemma3:4b   │  local, grátis           │  qualidade ↓  │
│  via Ollama  │  dados privados          │  CPU mais lento│
│              │  128K context            │               │
├──────────────┼──────────────────────────┼───────────────┤
│  Gemma3:12b  │  melhor qualidade local  │  8.1GB RAM    │
│  via Ollama  │  ainda privado           │  precisa GPU  │
└──────────────┴──────────────────────────┴───────────────┘
```

Para dados financeiros pessoais: **privacidade > qualidade**. Gemma 3 4B é a escolha certa. Roda em CPU (lento) ou GPU integrada. 128K de contexto permite enviar lotes de 50-100 transações numa só chamada.

---

### As perguntas que queremos responder

Antes de implementar, definir as perguntas é o mais importante:

```
PERGUNTAS QUE SQL RESPONDE (não precisam de LLM):
  - Quanto gastei em alimentação em março?
  - Qual meu saldo atual?
  - Qual categoria gastei mais?

PERGUNTAS QUE PRECISAM DE LLM:
  ✓ Qual o nome real do merchant desta transação?
  ✓ Esta transação é uma assinatura recorrente?
  ✓ Em que país ou cidade ocorreu este gasto?
  ✓ Este é um gasto de trabalho, pessoal ou compartilhado?
  ✓ Qual a subcategoria mais específica que posso atribuir?
  ✓ Este valor parece anômalo para este tipo de gasto?
  ✓ Quais tags descrevem melhor esta transação?
```

---

### Arquitetura do pipeline

```
Claude (usuário via MCP)
     │
     ▼ chama tool: enrich_transactions(limit=50)
MCP Server (TypeScript)
     │
     ▼ SELECT não-analisadas FROM f_transacoes
     │  WHERE id NOT IN (SELECT transaction_id FROM ai_transaction_insights)
     │  LIMIT 50
     │
     ▼ monta prompt com batch de transações
Ollama API (localhost:11434)
     │  modelo: gemma3:4b
     │  output: JSON estruturado
     │
     ▼ parse response
PostgreSQL
     │  INSERT INTO ai_transaction_insights (...)
     │  ON CONFLICT DO UPDATE
     ▼
Done — próxima query do Claude já tem insights
```

---

### Schema proposto para `ai_transaction_insights`

```sql
CREATE TABLE ai_transaction_insights (
  transaction_id    TEXT PRIMARY KEY REFERENCES transactions_enriched(id),
  merchant_name     TEXT,          -- "Netflix", "Amazon Web Services"
  merchant_country  TEXT,          -- "BR", "US"
  is_recurring      BOOLEAN,       -- assinatura detectada
  recurrence_period TEXT,          -- "monthly", "annual", "unknown"
  expense_context   TEXT,          -- "work", "personal", "shared"
  anomaly_score     NUMERIC(3,2),  -- 0.00 a 1.00
  tags              TEXT[],        -- ['assinatura', 'tech', 'streaming']
  category_hint     TEXT,          -- sugestão de categoria mais específica
  raw_response      JSONB,         -- resposta completa do LLM para auditoria
  analyzed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  model_version     TEXT NOT NULL  -- "gemma3:4b"
);
```

---

### Prompt design

O prompt para o Gemma 3 vai receber um array JSON de transações e retornar um array JSON de insights. Structured output com schema fixo. Exemplo:

```
Você é um analista financeiro. Analise as transações abaixo e retorne um JSON.
Para cada transação, extraia:
- merchant_name: nome real do estabelecimento (null se não identificável)
- is_recurring: true se parece assinatura mensal/anual
- expense_context: "personal", "work" ou "shared"
- tags: array de tags descritivas em português
- anomaly_score: 0.0 a 1.0 (0 = normal, 1 = muito anômalo)

Transações: [...]
Responda APENAS com JSON válido, sem markdown.
```

---

## Goals / Non-Goals

**Goals:**
- Definir schema de `ai_transaction_insights`
- Definir pipeline de enrichment sob demanda via Ollama
- Definir prompt template para Gemma 3
- Definir MCP tool `enrich_transactions`
- Definir como gold views fazem JOIN com `ai_transaction_insights`

**Non-Goals:**
- Não implementar agora (esta change é design)
- Não processar todas as transações automaticamente (sempre sob demanda)
- Não treinar modelos customizados
- Não usar APIs externas (privacidade)

## Decisions

**D1: Ollama como runtime, não biblioteca**
Ollama expõe API REST em `localhost:11434`. O MCP server faz HTTP POST para `/api/generate`. Zero dependência de SDK Python — é TypeScript puro com `fetch`.

**D2: Batch de 50 transações por chamada**
Gemma 3 4B tem contexto de 128K tokens. 50 transações cabem confortavelmente (~2K tokens de input). Batching reduz overhead de inicialização do modelo.

**D3: Enriquecimento incremental (só não-analisadas)**
`WHERE id NOT IN (SELECT transaction_id FROM ai_transaction_insights)`. Cada sync pode disparar enrichment apenas das novas transações. Idempotente.

**D4: `raw_response JSONB` para auditoria**
Guardamos a resposta completa do LLM. Se o modelo melhorar (gemma3:12b, gemma3:27b), podemos re-analisar com o novo modelo e comparar.

## Risks / Trade-offs

- **Qualidade do Gemma 3 4B** → para merchant normalization em português, pode errar em bancos brasileiros menos conhecidos. Mitigação: `raw_response` permite revisão e re-análise.
- **Velocidade em CPU** → ~2-5 segundos por batch em CPU sem GPU. Para 3.000 transações: ~2-5 minutos na primeira execução. Aceitável por ser sob demanda.
- **JSON parsing instável** → modelos pequenos às vezes quebram o JSON. Mitigação: prompt com exemplos explícitos + retry com parsing tolerante a erros.

## Open Questions (para gold-ai-agent)

- Vale a pena usar `gemma3:4b-it-qat` (quantization-aware, mesma qualidade com menos RAM)?
- Quais views gold devem incluir colunas de `ai_transaction_insights` por padrão?

---

## Decisões adicionais (sessão de explore 2026-05-13)

**D5: `is_debt_related` como campo crítico no `ai_transaction_insights`**
A análise real do cashflow de Fevereiro/2026 revelou que transações de empréstimo ("Depósito de empréstimo" +R$58k) entram como INCOME no bronze, distorcendo o cashflow. O LLM deve detectar isso e marcar `is_debt_related = true`. Este campo é o insumo principal do `ai_monthly_digest` para calcular `cashflow_real`. Sem ele, o digest não consegue distinguir receita real de dívida nova.

**D6: Segunda tabela `ai_monthly_digest` para análise narrativa de mês completo**
Há dois problemas distintos que o Gold-AI resolve:
- **Linha a linha**: enriquecimento semântico de cada transação (`ai_transaction_insights`)
- **Análise de conjunto**: narrativa do mês como um todo (`ai_monthly_digest`)

O digest consome o `ai_transaction_insights` já processado (não o bronze direto) — isso melhora a qualidade porque o LLM recebe `merchant_name` e `is_debt_related` em vez de descriptions cruas. A tabela armazena: `cashflow_real` (receitas − entradas de dívida), `debt_inflows`, `debt_payments`, `narrative_pt` (texto em português para o usuário), `structured_summary` (JSONB para o agente LLM via MCP), `flags[]`, `notable_expenses`, e `enrichment_coverage` (% das tx do mês que tinham ai_insights ao rodar o digest).

**D7: Trigger manual via script (Opção C)**
O digest mensal é disparado manualmente — o usuário pede ao agente "analise Fevereiro de 2026" e o agente chama `digest_month(year, month)`. Razões:
- Contexto familiar: análise é intencional, não automática
- Resultado salvo em cache na tabela — próximas perguntas sobre o mesmo mês usam o digest já gerado
- Enriquecimento linha a linha (`enrich_transactions`) também é manual/sob demanda
- Automação pós-sync pode ser adicionada depois se o padrão de uso justificar

**D8: Separação de concerns entre esta change e `gold-ai-agent`**
Esta change entrega apenas o schema (DDL SQL). A change `gold-ai-agent` implementa:
- Script TypeScript de enrichment linha a linha (Ollama + batch de 50)
- Script TypeScript de digest mensal (Ollama + prompt de contexto)
- MCP tools: `enrich_transactions(limit)` e `digest_month(year, month)`
- Prompt templates para ambos os pipelines

### Schema completo das duas tabelas gold-AI

```sql
-- Enriquecimento semântico linha a linha
CREATE TABLE ai_transaction_insights (
  transaction_id    TEXT PRIMARY KEY REFERENCES transactions_enriched(id),
  merchant_name     TEXT,           -- "Netflix", "Amazon Web Services"
  merchant_country  TEXT,           -- "BR", "US"
  is_recurring      BOOLEAN,        -- assinatura detectada
  recurrence_period TEXT,           -- "monthly", "annual", "unknown"
  expense_context   TEXT,           -- "work" | "personal" | "shared" | "debt"
  is_debt_related   BOOLEAN,        -- ← campo crítico: empréstimo/amortização detectado
  anomaly_score     NUMERIC(3,2),   -- 0.00 a 1.00
  tags              TEXT[],         -- ['assinatura', 'tech', 'streaming']
  category_hint     TEXT,           -- sugestão de categoria mais específica
  raw_response      JSONB,          -- resposta completa do LLM para auditoria
  analyzed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  model_version     TEXT NOT NULL   -- "gemma3:4b"
);

-- Análise narrativa de mês completo
CREATE TABLE ai_monthly_digest (
  year                 INT,
  month                INT,
  PRIMARY KEY (year, month),

  -- métricas calculadas pelo LLM
  cashflow_real        NUMERIC(18,2),  -- receitas − entradas de dívida
  debt_inflows         NUMERIC(18,2),  -- total de empréstimos recebidos
  debt_payments        NUMERIC(18,2),  -- total de amortizações pagas

  -- narrativa dual (usuário + agente)
  narrative_pt         TEXT,           -- texto fluido em português para o usuário ler
  structured_summary   JSONB,          -- JSON estruturado para o agente LLM via MCP

  -- flags e anomalias
  flags                TEXT[],         -- ['emprestimo_detectado', 'gastos_atipicos']
  notable_expenses     JSONB,          -- top anomalias do mês

  -- metadados de qualidade
  enrichment_coverage  NUMERIC(5,2),   -- % das tx do mês com ai_insights ao rodar
  model_version        TEXT,
  digest_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
```
