## ADDED Requirements

### Requirement: Docker Compose com PostgreSQL 16
O repositório SHALL conter um `docker-compose.yml` na raiz que define um serviço `postgres` usando imagem `postgres:16`, com volume persistente para dados, healthcheck via `pg_isready` e variáveis de ambiente configuráveis.

#### Scenario: Subir Postgres com docker compose
- **WHEN** `docker compose up -d` é executado em uma máquina com Docker
- **THEN** o serviço PostgreSQL sobe, passa no healthcheck e está acessível na porta 5432

#### Scenario: Dados persistem entre restarts
- **WHEN** `docker compose down` seguido de `docker compose up -d` é executado
- **THEN** os dados inseridos anteriormente ainda estão presentes no banco

### Requirement: Inicialização automática do schema
O `docker-compose.yml` SHALL montar `src/infrastructure/db/schema.sql` em `/docker-entrypoint-initdb.d/01-schema.sql`, de modo que o PostgreSQL execute o arquivo automaticamente na primeira inicialização do volume.

#### Scenario: Schema criado no primeiro start
- **WHEN** o serviço Postgres é iniciado pela primeira vez (volume vazio)
- **THEN** todas as tabelas definidas em `schema.sql` existem no banco após o start

#### Scenario: Schema não re-executado em restarts subsequentes
- **WHEN** `docker compose down && docker compose up -d` é executado (volume não destruído)
- **THEN** o `initdb.d` não é re-executado e os dados existentes são preservados

### Requirement: Schema SQL PostgreSQL-compatível
O arquivo `src/infrastructure/db/schema.sql` SHALL ser reescrito para PostgreSQL: identificadores em `snake_case` sem aspas, tipos nativos Postgres (`TEXT`, `NUMERIC(18,4)`), constraints (`PRIMARY KEY`, `REFERENCES`, `NOT NULL`) e índices (`CREATE INDEX IF NOT EXISTS`). O schema SHALL ser executável via `psql` ou `sql.file()` sem erros.

#### Scenario: Schema executa sem erros no Postgres
- **WHEN** o conteúdo de `schema.sql` é executado em um banco PostgreSQL 16 vazio
- **THEN** as 6 tabelas e todos os índices são criados sem erros

### Requirement: Configuração via variáveis de ambiente
O `docker-compose.yml` SHALL ler credenciais de um arquivo `.env` na raiz (ou variáveis de ambiente do shell). O `.env.example` SHALL documentar as variáveis necessárias: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` e `DATABASE_URL`.

#### Scenario: Credenciais via .env
- **WHEN** `.env` define `POSTGRES_USER=finance` e `POSTGRES_PASSWORD=finance`
- **THEN** o serviço sobe com essas credenciais e `DATABASE_URL=postgres://finance:finance@localhost:5432/finance` conecta com sucesso
