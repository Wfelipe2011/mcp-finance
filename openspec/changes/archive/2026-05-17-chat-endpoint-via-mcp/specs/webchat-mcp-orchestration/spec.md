## ADDED Requirements

### Requirement: Roteamento inicial por intenção para tools MCP
O backend do chat SHALL identificar a intenção da pergunta do usuário com regras determinísticas e mapear para um conjunto inicial de até 3 intents suportadas no MVP.

#### Scenario: Pergunta de saldo mensal
- **WHEN** o usuário envia pergunta sobre saldo, receitas ou despesas do mês
- **THEN** o orquestrador seleciona a tool `get_monthly_balance`

#### Scenario: Pergunta sobre assinaturas
- **WHEN** o usuário envia pergunta sobre assinaturas, recorrências ou mensalidades
- **THEN** o orquestrador seleciona a tool `get_subscription_analysis`

#### Scenario: Pergunta fora das intents suportadas
- **WHEN** a pergunta não corresponde às intents suportadas
- **THEN** o orquestrador retorna fallback textual orientando exemplos de perguntas aceitas

### Requirement: Chamada MCP tenant-scoped pelo servidor web
O backend do chat MUST chamar o servidor MCP via HTTP JSON-RPC e MUST incluir `tenant_id` autenticado nos argumentos da tool selecionada.

#### Scenario: Chamada MCP com tenant válido
- **WHEN** uma intent suportada é detectada e o tenant do JWT é válido
- **THEN** o servidor web chama `/mcp` na porta configurada com `tools/call` e argumentos contendo `tenant_id`

#### Scenario: Timeout ou indisponibilidade do MCP
- **WHEN** a chamada MCP excede o timeout configurado ou o serviço está indisponível
- **THEN** o chat retorna erro controlado e mensagem amigável para o usuário

### Requirement: Naturalização de payload MCP em resposta curta
O backend do chat SHALL converter o payload estruturado retornado pela tool MCP em resposta curta em português, com no máximo 3 frases.

#### Scenario: Payload MCP estruturado
- **WHEN** a tool retorna JSON válido com métricas financeiras
- **THEN** o sistema sintetiza uma resposta textual curta e acionável em português

#### Scenario: Payload inesperado
- **WHEN** a tool retorna formato não esperado ou impossível de interpretar
- **THEN** o sistema aplica fallback de resposta textual segura sem expor detalhes internos
