## ADDED Requirements

### Requirement: Executar sincronização completa em sequência ordenada
O sistema SHALL executar a sincronização na seguinte ordem: (1) obter token, (2) upsert items, (3) batch upsert accounts e investments, (4) fan-out paralelo de transactions e investment_transactions, (5) upsert identities. A ordem SHALL garantir que FKs sejam satisfeitas antes de inserções dependentes.

#### Scenario: Sync completo sem erros
- **WHEN** o script é executado e todos os serviços estão disponíveis
- **THEN** todas as entidades são coletadas e persistidas em ordem, sem violações de FK

### Requirement: Fan-out paralelo para transactions
O sistema SHALL buscar transactions de todas as accounts e investment_transactions de todos os investments em paralelo usando `Promise.all`, não de forma sequencial.

#### Scenario: Fan-out com múltiplas accounts e investments
- **WHEN** há N accounts e M investments
- **THEN** são feitas N+M chamadas HTTP em paralelo (não sequencial)

### Requirement: Persistência em transação de banco por tipo de entidade
O sistema SHALL persistir cada conjunto de entidades (ex: todas as transactions) dentro de uma única transação PostgreSQL usando `sql.begin()`, garantindo atomicidade — ou todas as linhas são inseridas ou nenhuma.

#### Scenario: Falha durante inserção de transactions
- **WHEN** uma inserção dentro do batch de transactions falha
- **THEN** nenhuma das transactions desse batch é persistida (rollback automático)

### Requirement: Logar progresso da sincronização
O sistema SHALL logar no console: início do sync, quantidade de entidades coletadas por tipo, tempo total de execução e confirmação de conclusão.

#### Scenario: Sync bem-sucedido
- **WHEN** o sync conclui sem erros
- **THEN** o console exibe contagens (ex: "5 items, 11 accounts, 2300 transactions...") e tempo total

### Requirement: Falhar com erro descritivo em caso de exceção
O sistema SHALL capturar exceções não tratadas no fluxo principal, logar a mensagem de erro com contexto e encerrar o processo com código de saída não-zero (`process.exit(1)`).

#### Scenario: Falha ao obter token
- **WHEN** o serviço de token está indisponível
- **THEN** o script loga o erro e termina com exit code 1

#### Scenario: Falha em chamada à API do Pluggy
- **WHEN** uma chamada HTTP ao Pluggy falha com 4xx ou 5xx
- **THEN** o script loga o erro incluindo o endpoint que falhou e termina com exit code 1

### Requirement: Configuração via variáveis de ambiente
O sistema SHALL ler o path do banco SQLite de uma variável de ambiente `DB_PATH`, com fallback para `./finance.db` se não definida. A URL do serviço de token SHALL ser configurável via `TOKEN_URL` com fallback para `http://192.168.0.194:4567/token`.

#### Scenario: DB_PATH definida
- **WHEN** `DB_PATH=/data/finance.db` está definida no ambiente
- **THEN** o banco é aberto/criado nesse path

#### Scenario: DB_PATH não definida
- **WHEN** `DB_PATH` não está no ambiente
- **THEN** o banco é criado em `./finance.db`

