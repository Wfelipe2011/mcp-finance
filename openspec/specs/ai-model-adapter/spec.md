## ADDED Requirements

### Requirement: Model adapter lê configuração de env vars
O sistema SHALL instanciar o modelo LLM a partir das variáveis de ambiente `AI_BASE_URL` e `AI_MODEL`. Se qualquer uma estiver ausente, SHALL lançar erro descritivo na inicialização.

#### Scenario: Env vars presentes — modelo inicializado com sucesso
- **WHEN** `AI_BASE_URL` e `AI_MODEL` estão definidas no ambiente
- **THEN** `model.ts` retorna instância `ChatOpenAI` funcional apontando para `AI_BASE_URL/v1`

#### Scenario: Env var ausente — erro descritivo
- **WHEN** `AI_BASE_URL` não está definida
- **THEN** o processo encerra com mensagem "AI_BASE_URL is not set"

### Requirement: Model adapter expõe withStructuredOutput
O sistema SHALL expor a instância do modelo de forma que os pipelines possam chamar `model.withStructuredOutput(zodSchema)` para garantir output estruturado validado.

#### Scenario: withStructuredOutput retorna objeto validado pelo schema Zod
- **WHEN** o modelo é invocado com `withStructuredOutput(schema)` e o servidor retorna JSON válido
- **THEN** o resultado é tipado conforme o schema Zod sem necessidade de parsing manual
