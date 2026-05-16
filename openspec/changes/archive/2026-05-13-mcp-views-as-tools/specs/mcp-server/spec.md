## REMOVED Requirements

### Requirement: Resources de views financeiras
**Reason**: Substituído por Tools de leitura (`get_*`) que oferecem compatibilidade universal com clientes MCP e suporte a parâmetros. Resources são removidos junto com a capability `resources: {}` do servidor.
**Migration**: Usar `tools/call` com as tools `get_overview`, `get_bank_summary`, etc. em vez de `resources/read`.

### Requirement: URIs dos Resources
**Reason**: Os URIs `finance://views/*` deixam de existir com a remoção dos Resources.
**Migration**: As tools equivalentes são identificadas por nome (ex: `get_overview` em vez de `finance://views/overview`).

### Requirement: Conexão readonly ao banco para Resources
**Reason**: A distinção de conexão readonly era necessária para o ciclo de vida dos Resources (conexão permanente). Com tools stateless por request, `FinanceQueryDb` continua readonly mas o requisito de separação de ciclo de vida deixa de ser relevante como requisito de spec.
**Migration**: N/A — `FinanceQueryDb` continua readonly internamente.

## MODIFIED Requirements

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
