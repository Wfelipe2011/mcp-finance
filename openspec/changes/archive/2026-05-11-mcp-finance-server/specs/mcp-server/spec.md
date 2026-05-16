## ADDED Requirements

### Requirement: Servidor MCP Streamable HTTP
O sistema SHALL disponibilizar um servidor MCP usando `StreamableHTTPServerTransport` da SDK `@modelcontextprotocol/sdk`. O servidor SHALL escutar na porta definida pela variável de ambiente `MCP_PORT`, com fallback para `3000`. O servidor SHALL fazer bind em `127.0.0.1` por padrão para evitar exposição em rede.

#### Scenario: Servidor inicia sem erros
- **WHEN** `bun run mcp` é executado e a variável `DB_PATH` aponta para um banco válido
- **THEN** o servidor imprime a porta em uso e fica aguardando conexões

#### Scenario: Porta configurável via env
- **WHEN** `MCP_PORT=4000 bun run mcp` é executado
- **THEN** o servidor escuta na porta 4000

### Requirement: Resources de views financeiras
O sistema SHALL registrar 11 Resources MCP, um para cada view SQLite, com URIs no esquema `finance://views/<slug>` e `mimeType: "application/json"`. Cada resource SHALL retornar o resultado da query como array JSON serializado em `contents[0].text`.

#### Scenario: Leitura de resource de overview
- **WHEN** um cliente MCP lê `finance://views/overview`
- **THEN** o response contém `contents[0].text` com o JSON array de linhas da `v_overview`

#### Scenario: Leitura de resource de cashflow
- **WHEN** um cliente MCP lê `finance://views/monthly-cashflow`
- **THEN** o response contém `contents[0].text` com o JSON array de até 13 meses de cashflow

#### Scenario: Resources listados no capabilities
- **WHEN** um cliente MCP faz `resources/list`
- **THEN** a resposta inclui os 11 resources com seus URIs e descriptions

### Requirement: URIs dos Resources
Os slugs dos 11 Resources SHALL ser:
- `finance://views/overview`
- `finance://views/bank-summary`
- `finance://views/credit-summary`
- `finance://views/investment-summary`
- `finance://views/net-worth`
- `finance://views/monthly-cashflow`
- `finance://views/spending-by-cat`
- `finance://views/investment-maturity`
- `finance://views/credit-alerts`
- `finance://views/top-categories-30d`
- `finance://views/budget-5030-20`

#### Scenario: URI válida para cada view
- **WHEN** o servidor é iniciado
- **THEN** todos os 11 recursos estão registrados com os URIs exatos acima

### Requirement: Conexão readonly ao banco para Resources
O sistema SHALL abrir o banco SQLite em modo `readonly: true` para servir os Resources. Esta conexão SHALL ser distinta e independente da conexão de escrita usada pelo `BunSQLiteAdapter`.

#### Scenario: Resource não modifica banco
- **WHEN** qualquer resource é lido N vezes
- **THEN** o banco não é modificado (nenhum PRAGMA de escrita, nenhum INSERT/UPDATE/DELETE)

### Requirement: Tool MCP de sync
O sistema SHALL registrar um Tool MCP chamado `sync` sem parâmetros de entrada. Quando invocado, o tool SHALL executar o `SyncUseCase` completo e retornar um JSON com o resumo: `{items, accounts, transactions, investments, durationMs}`.

#### Scenario: Invocação do tool sync com sucesso
- **WHEN** um cliente MCP invoca o tool `sync`
- **THEN** o response contém `content[0].text` com JSON do resumo da execução

#### Scenario: Tool sync falha graciosamente
- **WHEN** o tool `sync` é invocado e a API Pluggy retorna erro
- **THEN** o tool retorna `isError: true` com a mensagem de erro serializada em JSON
