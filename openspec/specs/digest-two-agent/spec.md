## ADDED Requirements

### Requirement: Pipeline de dois agentes para digest mensal
O sistema SHALL usar dois LLM calls sequenciais para gerar o digest mensal: o primeiro para análise livre e o segundo para extração estruturada.

#### Scenario: Agent 1 gera análise textual
- **WHEN** `generateDigest()` é chamado com dados do mês
- **THEN** Agent 1 recebe os dados e retorna um texto analítico em português (sem schema)
- **THEN** o texto contém interpretação de cashflow, dívidas, anomalias e cobertura de enriquecimento

#### Scenario: Agent 2 extrai campos estruturados
- **WHEN** Agent 1 retorna texto analítico
- **THEN** Agent 2 recebe o texto e preenche `MonthlyDigestSchema` (narrative_pt, flags, notable_expenses, structured_summary)
- **THEN** `result.structuredResponse` é um `MonthlyDigest` válido

#### Scenario: Agent 1 sem resposta
- **WHEN** Agent 1 retorna conteúdo vazio ou undefined
- **THEN** `generateDigest()` lança erro com mensagem descritiva antes de chamar o Agent 2

#### Scenario: Interface pública inalterada
- **WHEN** `generateDigest(input)` é chamado de `digest.ts`
- **THEN** retorna `MonthlyDigest` com os mesmos campos de antes
- **THEN** nenhuma mudança em `BunPgAdapter`, `digest.ts` ou `MonthlyDigestSchema.ts` é necessária
