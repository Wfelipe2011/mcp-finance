## MODIFIED Requirements

### Requirement: Servidor MCP Streamable HTTP
O sistema SHALL disponibilizar um servidor MCP via Streamable HTTP no backend atual, usando a stack MCP suportada pelo projeto. O servidor SHALL escutar na porta definida por MCP_PORT com fallback para 3000, SHALL fazer bind em 127.0.0.1 por padrao, e SHALL declarar capabilities de tools para discovery por clientes MCP.

#### Scenario: Servidor inicia com dependencias minimas
- **WHEN** o processo MCP e iniciado com DATABASE_URL valido
- **THEN** o servidor sobe sem erro e expoe endpoint MCP pronto para initialize

#### Scenario: Porta configuravel por ambiente
- **WHEN** MCP_PORT e definido para um valor valido
- **THEN** o servidor escuta exatamente na porta configurada

#### Scenario: Capabilities focadas em tools
- **WHEN** um cliente MCP executa initialize
- **THEN** a resposta inclui suporte a tools para tools/list e tools/call

### Requirement: Tool MCP de sync
O sistema SHALL registrar uma tool sync para disparar sincronizacao tenant-scoped. A tool SHALL receber tenant_id quando nao houver contexto autenticado, SHALL executar SyncUseCase nesse escopo, e SHALL retornar resumo estruturado com {items, accounts, transactions, investments, durationMs, enrich_queued}.

#### Scenario: Sync com sucesso
- **WHEN** a tool sync e chamada com tenant valido
- **THEN** a sincronizacao e executada para esse tenant e o resumo e retornado no resultado da tool

#### Scenario: Sync com tenant invalido
- **WHEN** a tool sync recebe tenant_id inexistente ou sem permissao
- **THEN** a tool retorna isError true com mensagem de validacao

## ADDED Requirements

### Requirement: Isolamento de tenant nas tools MCP
Toda tool tenant-scoped SHALL validar tenant_id e SHALL executar consultas no contexto do tenant via app.tenant_id antes de acessar dados. Quando existir contexto autenticado na sessao MCP, qualquer tenant_id informado no input SHALL coincidir com o tenant autenticado.

#### Scenario: Chamada com tenant de outra sessao
- **WHEN** uma tool tenant-scoped e chamada com tenant_id diferente do tenant autenticado
- **THEN** a tool retorna isError true e nao executa query de dados

#### Scenario: Chamada sem contexto autenticado
- **WHEN** uma tool tenant-scoped e chamada sem contexto autenticado e sem tenant_id explicito
- **THEN** a tool retorna isError true indicando tenant_id obrigatorio

### Requirement: Erros de validacao e execucao padronizados
Todas as tools SHALL retornar erros de validacao e de execucao com isError true e mensagem descritiva, sem vazar dados de outros tenants.

#### Scenario: Parametro invalido
- **WHEN** uma tool recebe parametro fora do range permitido
- **THEN** a resposta da tool contem isError true e mensagem indicando o campo invalido

#### Scenario: Falha inesperada na consulta
- **WHEN** ocorre erro interno durante a execucao da tool
- **THEN** a resposta da tool contem isError true com mensagem segura e sem dados sensiveis
