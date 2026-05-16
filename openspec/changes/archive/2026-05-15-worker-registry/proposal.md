## Why

Os workers de enrich são processos Bun que instanciam modelos AI. Cada worker é uma configuração de modelo (`AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`). Para que o sistema possa escalar (mais modelos = mais paralelismo) e se auto-recuperar de falhas, precisa de um registro persistente de workers e um supervisor que os orquestre.

## What Changes

- Endpoints CRUD para gestão de workers (apenas super admin): `POST`, `GET`, `PATCH`, `DELETE /api/admin/workers`
- Super admin autenticado via credenciais em `.env` (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`) — login via `POST /api/admin/login` emite JWT com role `super_admin`
- Supervisor Bun: processo separado que lê workers `active` do banco a cada 10 minutos, spawna/mata processos filhos conforme necessário
- Auto-deactivação: se worker acumula `error_count >= 5` em sequência, supervisor seta `status='error'`; se processo filho morre inesperadamente, supervisor incrementa contador e eventualmente seta `status='error'`
- `workers.last_seen_at` atualizado a cada job processado (heartbeat implícito via `markDone`/`markError`)

## Capabilities

### New Capabilities

- `super-admin-auth`: Login super admin via env vars, JWT com role `super_admin`, rota `POST /api/admin/login`
- `worker-crud`: CRUD de workers via API (`/api/admin/workers`) — apenas super admin
- `worker-supervisor`: Processo supervisor que gerencia processos filhos de workers, reconcilia a cada 10 minutos, detecta crashes e auto-desativa workers problemáticos

## Impact

- `src/application/web/routes/admin/` — novo diretório com `login.ts` e `workers.ts`
- `src/application/web/router.ts` — adiciona rotas `/api/admin/*`
- `src/application/web/auth-middleware.ts` — adiciona verificação de role `super_admin` para rotas admin
- `src/infrastructure/db/BunPgAdapter.ts` — métodos CRUD para `workers` table
- `src/application/supervisor/supervisor.ts` — novo arquivo: processo supervisor
- `.env` — novas vars `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`
- `package.json` — adiciona script `"supervisor"` para rodar o supervisor
