## Why

Ao subir o projeto com `docker compose up` em ambiente limpo (volume PostgreSQL novo), apenas `schema.sql` é aplicado via `initdb.d`. As views silver e gold (`silver-dimensions.sql`, `silver-facts.sql`, `gold-ai.sql`, `gold-cubes.sql`) precisam ser aplicadas manualmente — um passo invisível que quebra o dashboard na primeira execução e em qualquer novo deploy.

## What Changes

- Adicionar os quatro arquivos SQL de views como volumes montados em `initdb.d` no serviço `postgres` do `docker-compose.yml`, com prefixos numéricos que garantem a ordem de execução correta
- Nenhuma alteração de código — apenas configuração do Docker Compose

## Capabilities

### New Capabilities

_(nenhuma — correção de infraestrutura de setup)_

### Modified Capabilities

- `postgres-docker`: a inicialização do PostgreSQL passa a aplicar silver + gold automaticamente no primeiro start

## Impact

- **`docker-compose.yml`** — 4 novas linhas de volume no serviço `postgres`
- Ordem de aplicação: `01-schema.sql` → `02-silver-dimensions.sql` → `03-gold-ai.sql` → `04-silver-facts.sql` → `05-gold-cubes.sql`
- Apenas afeta volumes novos (primeiro start); volumes existentes não são reexecutados
