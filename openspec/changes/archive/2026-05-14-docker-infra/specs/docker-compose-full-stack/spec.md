## ADDED Requirements

### Requirement: docker-compose.yml inclui serviço api-server
O sistema SHALL ter o serviço `api-server` no `docker-compose.yml` configurado para aguardar o postgres estar healthy antes de iniciar, com a `DATABASE_URL` apontando para o hostname interno `postgres:5432`.

#### Scenario: docker compose up sobe postgres e api-server
- **WHEN** desenvolvedor executa `docker compose up`
- **THEN** serviço `postgres` inicia primeiro; `api-server` aguarda healthcheck do postgres passar antes de iniciar

#### Scenario: api-server acessível na porta 3001 do host
- **WHEN** api-server está rodando
- **THEN** `http://localhost:3001/api/meses` retorna JSON válido do host

#### Scenario: DATABASE_URL resolve postgres pelo nome do serviço
- **WHEN** api-server inicia dentro da rede Docker
- **THEN** conecta ao PostgreSQL usando hostname `postgres` (não `localhost`)

#### Scenario: Variáveis de ambiente injetadas via compose
- **WHEN** compose sobe o api-server
- **THEN** `DATABASE_URL`, `AI_BASE_URL` e `AI_MODEL` são injetados do `.env` do host via `env_file`

#### Scenario: Scripts ETL executáveis via docker compose run
- **WHEN** desenvolvedor executa `docker compose run --rm api-server bun run src/scripts/sync.ts`
- **THEN** script roda dentro do container com acesso ao postgres e variáveis de ambiente

#### Scenario: Frontend acessível pelo browser
- **WHEN** api-server está rodando e usuário acessa `http://localhost:3001`
- **THEN** browser recebe `client/dist/index.html` e o dashboard React carrega
