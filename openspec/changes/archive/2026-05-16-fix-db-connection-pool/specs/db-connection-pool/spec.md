## ADDED Requirements

### Requirement: Pool SQL compartilhado por processo
O servidor web SHALL manter uma única instância `SQL` (pool de conexões) durante todo o ciclo de vida do processo. Essa instância SHALL ser criada no startup e encerrada no shutdown do servidor.

#### Scenario: Pool criado no startup
- **WHEN** o servidor web inicia
- **THEN** uma única instância SQL é criada com a `DATABASE_URL` configurada
- **THEN** nenhum handler de rota cria instâncias SQL adicionais

#### Scenario: Pool encerrado no shutdown
- **WHEN** o servidor recebe sinal de encerramento (SIGTERM/SIGINT)
- **THEN** o pool SQL compartilhado é fechado gracefully

### Requirement: Isolamento de tenant por transação
O sistema SHALL garantir que queries de tenants diferentes executadas concorrentemente não interfiram entre si, usando o mecanismo `set_config('app.tenant_id', tid, true)` dentro de transações.

#### Scenario: Requests concorrentes de tenants diferentes
- **WHEN** duas requisições HTTP de tenants distintos chegam simultaneamente
- **THEN** cada request executa em conexões físicas separadas do pool
- **THEN** o `app.tenant_id` de cada conexão é restrito à sua própria transação
- **THEN** dados de um tenant não são expostos ao outro

#### Scenario: Conexão retorna ao pool sem estado residual
- **WHEN** uma transação com `set_config(tenant_id, is_local=true)` faz COMMIT ou ROLLBACK
- **THEN** a conexão retorna ao pool com `app.tenant_id` resetado
- **THEN** a próxima requisição que usar essa conexão não herda o tenant anterior

### Requirement: BunPgAdapter aceita SQL externo
O `BunPgAdapter` SHALL aceitar uma instância `SQL` externa via construtor. Quando fornecida, SHALL usá-la em vez de criar um novo pool. Quando não fornecida, SHALL criar e possuir seu próprio pool (comportamento atual para workers e scripts).

#### Scenario: Adapter com SQL externo não fecha o pool
- **WHEN** `BunPgAdapter` é instanciado com um `SQL` externo
- **AND** `db.close()` é chamado
- **THEN** o pool SQL externo NÃO é fechado

#### Scenario: Adapter sem SQL externo gerencia seu próprio pool
- **WHEN** `BunPgAdapter` é instanciado sem SQL externo (workers, scripts)
- **AND** `db.close()` é chamado
- **THEN** o pool SQL interno é fechado normalmente
