## Why

Com o sistema multi-tenant operacional e o backend de workers e tenants gerenciado via API, o super admin precisa de uma interface visual para operar o sistema sem precisar de `curl` ou acesso direto ao banco. O painel deve ser simples, rápido de implementar e completamente isolado do bundle React dos tenants.

## What Changes

- Adiciona handler `GET /admin` no servidor Bun que serve HTML+JS vanilla inline (sem build step, sem React)
- O painel exibe duas seções: lista de tenants e lista de workers — consumindo as APIs `/api/admin/tenants` e `/api/admin/workers` já existentes
- Adiciona form de login do super admin inline na página (chama `POST /api/admin/login` existente)
- Adiciona form de criação de tenant inline na seção de tenants
- Adiciona form de criação de worker inline na seção de workers
- Ações disponíveis: ativar/desativar tenant, reativar/remover worker
- Sem novas dependências de pacotes — HTML+JS puro servido pelo Bun como string template

## Capabilities

### New Capabilities

- `admin-panel-ui`: Página HTML+JS vanilla em `GET /admin` que autentica o super admin e exibe painel de gestão de tenants e workers. Zero toque no bundle React.

### Modified Capabilities

_(nenhuma — o painel consome APIs já existentes sem alterar seus contratos)_

## Impact

- `src/application/web/routes/admin/panel.ts` — novo arquivo com handler que retorna HTML como string
- `src/application/web/router.ts` — adiciona rota `GET /admin` sem guard JWT (a autenticação é gerenciada pelo próprio JS da página)
- Depende de: `worker-registry` (endpoints workers + login super admin), `tenant-lifecycle` (endpoints tenants)
- Sem novas dependências de pacotes
