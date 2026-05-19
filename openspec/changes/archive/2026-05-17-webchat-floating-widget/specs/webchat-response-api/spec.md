## ADDED Requirements

### Requirement: Endpoint autenticado para resposta de chat
O sistema SHALL expor `POST /api/chat` como endpoint protegido por JWT de tenant para processar perguntas do webchat do usuário.

#### Scenario: Chamada autenticada válida
- **WHEN** a requisição `POST /api/chat` inclui token Bearer válido
- **THEN** o endpoint processa a pergunta no contexto do tenant autenticado
- **AND** retorna resposta em JSON com status 200

#### Scenario: Chamada sem autenticação
- **WHEN** a requisição `POST /api/chat` não inclui token válido
- **THEN** o sistema retorna 401 Unauthorized

### Requirement: Contrato de requisição e resposta do chat
O endpoint SHALL aceitar payload JSON com `message` textual e histórico opcional da conversa curta, e SHALL retornar `reply` textual em português.

#### Scenario: Payload mínimo
- **WHEN** o cliente envia `{ "message": "<texto>" }`
- **THEN** o endpoint aceita a requisição e responde com `{ "reply": "<texto>" }`

#### Scenario: Payload com histórico opcional
- **WHEN** o cliente envia `message` com `history` contendo mensagens anteriores
- **THEN** o endpoint usa o histórico como contexto adicional para gerar a resposta

### Requirement: Validação de entrada do chat
O sistema MUST validar a mensagem recebida para evitar chamadas vazias ou inválidas.

#### Scenario: Mensagem vazia
- **WHEN** o cliente envia `message` vazio ou apenas espaços
- **THEN** o endpoint retorna 400 com erro de validação

#### Scenario: Tipo inválido
- **WHEN** o cliente envia payload sem `message` string
- **THEN** o endpoint retorna 400 com erro de validação

### Requirement: Resposta curta e tratamento de falhas de IA
O sistema SHALL instruir o agente de IA a responder de forma curta e acionável em português e MUST retornar erro controlado quando houver falha interna de geração.

#### Scenario: Resposta gerada com sucesso
- **WHEN** o serviço de IA responde normalmente
- **THEN** o endpoint retorna texto curto em português no campo `reply`

#### Scenario: Falha no serviço de IA
- **WHEN** ocorre erro interno na chamada ao modelo de IA
- **THEN** o endpoint retorna 500 com mensagem de erro genérica para o cliente
