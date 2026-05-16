## ADDED Requirements

### Requirement: Adaptador PostgreSQL com upsert para todos os repositórios
O sistema SHALL implementar `BunPgAdapter` usando `Bun.sql` (driver nativo do Bun) que expõe os 6 repositórios do domínio (`items`, `accounts`, `transactions`, `investments`, `investmentTransactions`, `identities`), cada um com método `upsertMany`. O adapter SHALL conectar ao PostgreSQL via variável de ambiente `DATABASE_URL` no formato `postgres://`.

#### Scenario: Upsert de items
- **WHEN** `items.upsertMany(rows)` é chamado com um array de `Item`
- **THEN** todos os registros são inseridos ou atualizados (ON CONFLICT id) no banco PostgreSQL

#### Scenario: Array vazio não executa query
- **WHEN** qualquer `upsertMany([])` é chamado com array vazio
- **THEN** nenhuma query é enviada ao banco

#### Scenario: DATABASE_URL não configurada causa erro na inicialização
- **WHEN** `BunPgAdapter` é instanciado sem `DATABASE_URL` definida
- **THEN** o processo falha com erro descritivo antes de tentar qualquer query

### Requirement: Upsert de cada tipo de entidade em transação única
Cada chamada a `upsertMany` SHALL envolver todas as inserções do lote em uma única transação PostgreSQL via `sql.begin()`. Se qualquer inserção do lote falhar, a transação inteira SHALL ser revertida (rollback automático).

#### Scenario: Falha parcial no lote de transactions
- **WHEN** `transactions.upsertMany(rows)` é chamado e uma inserção falha com violação de constraint
- **THEN** nenhuma transaction do lote é persistida

### Requirement: Mapeamento camelCase→snake_case no adapter
O `BunPgAdapter` SHALL mapear os campos camelCase das entidades do domínio para os identificadores snake_case do schema PostgreSQL. As entidades do domínio SHALL permanecer inalteradas (camelCase). O mapeamento SHALL ser explícito no código do adapter, coluna por coluna.

#### Scenario: Campo itemId mapeado corretamente
- **WHEN** `accounts.upsertMany([account])` é chamado com `account.itemId = "abc"`
- **THEN** a coluna `item_id` na tabela `accounts` recebe o valor `"abc"`

### Requirement: Método close para encerrar pool de conexões
O `BunPgAdapter` SHALL expor um método `async close(): Promise<void>` que chama `sql.close()` para encerrar o pool de conexões PostgreSQL de forma limpa.

#### Scenario: Fechamento do adapter após sync
- **WHEN** `adapter.close()` é chamado após o sync completar
- **THEN** o pool de conexões é encerrado sem erros pendentes
