## Why

Cada requisição HTTP ao servidor cria um novo `BunPgAdapter` que abre um pool SQL dedicado via `new SQL(url)` e **nunca fecha** (apenas `sync.ts` chama `db.close()`). Com uso normal, as conexões `idle` acumulam até esgotar o `max_connections = 100` do Postgres, resultando em `FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute`. A solução é substituir a criação de pool por request por um **singleton SQL compartilhado** que vive junto com o processo do servidor.

## What Changes

- `BunPgAdapter` passa a aceitar um `SQL` externo opcional no construtor — se fornecido, usa-o em vez de criar um novo
- O servidor web (`server.ts`) cria **uma única instância** `SQL` no startup e a passa para todos os handlers de rota
- Os handlers de rota deixam de instanciar `BunPgAdapter` diretamente; recebem o `sql` compartilhado via parâmetro ou injeção
- O método `db.close()` passa a ser no-op quando o `SQL` é externo (não deve fechar o pool compartilhado)
- Handlers admin (`tenants.ts`, `workers.ts`) e workers de enriquecimento também migram para o singleton

## Capabilities

### New Capabilities

- `db-connection-pool`: Pool de conexões SQL singleton compartilhado entre todos os handlers HTTP, com ciclo de vida acoplado ao processo do servidor

### Modified Capabilities

<!-- Nenhuma spec de requisito de negócio muda — apenas infraestrutura interna -->

## Impact

- `src/infrastructure/db/BunPgAdapter.ts` — construtor aceita `SQL` externo
- `src/application/web/server.ts` — cria e gerencia singleton SQL
- `src/application/web/router.ts` — propaga o `sql` compartilhado para os handlers
- `src/application/web/routes/*.ts` — todos os handlers de rota (13 arquivos)
- `src/application/web/routes/auth.ts` — usa `SQL` próprio por ser chamada pré-pool (avaliar)
- `src/application/workers/enrich-worker.ts` — continua criando seu próprio pool (processo separado, OK)
- `src/application/supervisor/supervisor.ts` — continua criando pools curtos por operação (OK, não é hot path)
- Postgres: redução de ~97 conexões idle para ~5-10 conexões no pool
