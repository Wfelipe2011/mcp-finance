## 1. Refatorar digestAgent.ts

- [x] 1.1 Criar `agentAnalyze` sem `responseFormat` (análise livre) e `agentExtract` com `MonthlyDigestSchema`
- [x] 1.2 No `generateDigest()`, chamar `agentAnalyze` com dados do mês e extrair o texto de `result.content`
- [x] 1.3 Adicionar guard: se `result.content` for vazio/undefined, lançar erro descritivo
- [x] 1.4 Montar prompt do `agentExtract` com o texto analítico do Agent 1
- [x] 1.5 Chamar `agentExtract` e retornar `result.structuredResponse as MonthlyDigest`

## 2. Validação

- [x] 2.1 Rodar `bun run digest --month 2026-01` e confirmar que retorna sem erro
- [x] 2.2 Verificar no banco que `narrative_pt` não é nulo e tem conteúdo analítico de qualidade
- [x] 2.3 Verificar que `flags` e `notable_expenses` estão preenchidos corretamente
- [x] 2.4 Rodar uma segunda vez e confirmar idempotência (ON CONFLICT atualiza sem erro)
