## MODIFIED Requirements

### Requirement: Contrato de requisição e resposta do chat
O endpoint SHALL aceitar payload JSON com `message` textual e histórico opcional da conversa curta, e SHALL retornar `reply` textual em português.

#### Scenario: Payload mínimo
- **WHEN** o cliente envia `{ "message": "<texto>" }`
- **THEN** o endpoint aceita a requisição e responde com `{ "reply": "<texto>" }`

#### Scenario: Payload com histórico opcional
- **WHEN** o cliente envia `message` com `history` contendo mensagens anteriores
- **THEN** o endpoint preserva compatibilidade com esse contrato e pode usar o histórico como contexto adicional de orquestração

### Requirement: Resposta curta e tratamento de falhas de IA
O sistema SHALL obter dados por meio de tools MCP para compor resposta curta e acionável em português e MUST retornar erro controlado quando houver falha interna na orquestração.

#### Scenario: Resposta gerada com sucesso
- **WHEN** a chamada MCP e a naturalização retornam normalmente
- **THEN** o endpoint retorna texto curto em português no campo `reply`

#### Scenario: Falha no serviço de IA
- **WHEN** ocorre timeout, erro de chamada MCP ou falha interna de transformação da resposta
- **THEN** o endpoint retorna 500 com mensagem de erro genérica para o cliente
