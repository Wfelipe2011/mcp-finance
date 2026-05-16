## Why

Os cubos gold respondem "quanto" e "quando". Mas há uma classe de perguntas que SQL não responde: "isso é uma assinatura recorrente?", "qual o nome real do merchant?", "Fevereiro teve saldo positivo real ou foi inflado por dívida nova?". Um modelo LLM local (Gemma 3 via Ollama) pode analisar transações linha a linha e meses como narrativa, salvando análises estruturadas em tabelas gold — enriquecendo o sistema com inteligência semântica persistente.

Esta change **cria o schema e documenta as decisões de design**. O pipeline de enrichment (Ollama, agente TypeScript, MCP tool) será implementado numa change separada (`gold-ai-agent`). Separar schema de implementação permite usar as tabelas como destino de scripts manuais desde já, e construir o agente com o schema estável como contrato.

## What Changes

- Cria tabela `ai_transaction_insights` (enriquecimento semântico linha a linha)
- Cria tabela `ai_monthly_digest` (análise narrativa de mês completo)
- Cria SQL de migração em `src/infrastructure/db/gold-ai.sql`
- Documenta decisões de design para a change `gold-ai-agent`
- **NÃO implementa pipeline, agente ou MCP tool** — isso vai para `gold-ai-agent`

## Capabilities

### New Capabilities

- `gold-ai-schema`: Tabelas `ai_transaction_insights` + `ai_monthly_digest` com schema completo

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Não requer Ollama ainda — schema é criado vazio, pronto para receber dados do agente
- Não altera nenhuma tabela bronze ou silver
- Adiciona uma tabela nova: `ai_transaction_insights`
- MCP server ganha uma nova tool de enrichment
- Enriquecimento é **sob demanda**: só roda quando explicitamente chamado
