## Why

Com as 6 mudanças do dashboard implementadas (`web-api-server` + `web-client-setup` + 4 abas), o projeto precisa ser empacotado para uso como produto final. Hoje é necessário: ter Bun instalado no host, rodar `bun install`, configurar variáveis de ambiente manualmente e iniciar o servidor separado do PostgreSQL. O objetivo é que um único `docker compose up` suba o sistema completo — banco + servidor API + frontend — sem dependências no host além do Docker.

## What Changes

- Criar `Dockerfile` multi-stage na raiz: stage 1 builda o client React, stage 2 empacota o server Bun com o bundle gerado
- Atualizar `docker-compose.yml` adicionando o serviço `api-server` com `depends_on: postgres`
- Criar `.dockerignore` para excluir `node_modules`, `client/node_modules`, `client/dist`, `.env`, arquivos de desenvolvimento
- Atualizar `.env.example` adicionando `PORT=3001`
- **Os scripts `sync`, `enrich`, `digest` continuam rodando no host** via `docker compose run --rm api-server bun run src/scripts/sync.ts` ou diretamente com Bun no host (PostgreSQL exposto em `:5434`)

## Capabilities

### New Capabilities

- `docker-api-server-image`: imagem Docker multi-stage que builda o client React e empacota junto com o Bun server
- `docker-compose-full-stack`: compose atualizado com serviço `api-server` dependente de `postgres` com healthcheck

### Modified Capabilities

## Impact

- **Arquivo modificado**: `docker-compose.yml` — adição do serviço `api-server`
- **Arquivos novos**: `Dockerfile`, `.dockerignore`
- **`.env.example`**: adição de `PORT=3001`
- **Sem mudanças** em `src/`, `client/` ou qualquer código da aplicação
- **Pré-requisito**: changes `web-api-server` e `web-client-setup` (e idealmente as 4 abas) devem estar implementadas antes desta mudança
