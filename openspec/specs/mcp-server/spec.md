### Requirement: Servidor MCP Streamable HTTP
O sistema SHALL disponibilizar um servidor MCP usando `StreamableHTTPServerTransport` da SDK `@modelcontextprotocol/sdk`. O servidor SHALL escutar na porta definida pela variável de ambiente `MCP_PORT`, com fallback para `3000`. O servidor SHALL fazer bind em `127.0.0.1` por padrão para evitar exposição em rede. O servidor SHALL declarar apenas `capabilities: { tools: {} }` — sem `resources`.

#### Scenario: Servidor inicia sem erros
- **WHEN** `bun run mcp` é executado e a variável `DB_PATH` aponta para um banco válido
- **THEN** o servidor imprime a porta em uso e fica aguardando conexões

#### Scenario: Porta configurável via env
- **WHEN** `MCP_PORT=4000 bun run mcp` é executado
- **THEN** o servidor escuta na porta 4000

#### Scenario: Capabilities não inclui resources
- **WHEN** um cliente MCP faz `initialize`
- **THEN** o response de capabilities contém `tools` mas não `resources`

### Requirement: Tool MCP de sync
O sistema SHALL registrar um Tool MCP chamado `sync` sem parâmetros de entrada. Quando invocado, o tool SHALL executar o `SyncUseCase` completo e retornar um JSON com o resumo: `{items, accounts, transactions, investments, durationMs}`.

#### Scenario: Invocação do tool sync com sucesso
- **WHEN** um cliente MCP invoca o tool `sync`
- **THEN** o response contém `content[0].text` com JSON do resumo da execução

#### Scenario: Tool sync falha graciosamente
- **WHEN** o tool `sync` é invocado e a API Pluggy retorna erro
- **THEN** o tool retorna `isError: true` com a mensagem de erro serializada em JSON
