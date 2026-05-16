## 1. Super Admin Auth

- [x] 1.1 Adicionar `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` ao `.env.example`
- [x] 1.2 Criar `src/application/web/routes/admin/login.ts` — `POST /api/admin/login` com comparação timing-safe contra env vars, emite JWT com `{ sub: email, role: 'super_admin' }`
- [x] 1.3 Criar middleware `requireSuperAdmin` em `auth-middleware.ts` — verifica JWT com `role: 'super_admin'`, retorna 403 se ausente
- [x] 1.4 Adicionar rota `POST /api/admin/login` ao `router.ts` (pública, sem auth)

## 2. CRUD de Workers

- [x] 2.1 Adicionar métodos ao `BunPgAdapter` para `workers`: `create(data)`, `findAll()`, `update(id, data)`, `remove(id)`, `findActive()`
- [x] 2.2 Criar `src/application/web/routes/admin/workers.ts` com handlers: `handleCreateWorker`, `handleListWorkers`, `handleUpdateWorker`, `handleDeleteWorker`
- [x] 2.3 Adicionar rotas ao `router.ts`: `POST /api/admin/workers`, `GET /api/admin/workers`, `PATCH /api/admin/workers/:id`, `DELETE /api/admin/workers/:id` — todos com `requireSuperAdmin`

## 3. Supervisor

- [x] 3.1 Criar `src/application/supervisor/supervisor.ts`
- [x] 3.2 Implementar `reconcile()` — lê workers `active` do banco, compara com `Map<workerId, ChildProcess>`, spawna novos, mata removidos/inativos
- [x] 3.3 Implementar tratamento de `proc.on('exit')` — incrementa `error_count`; se `>= 5` seta `status='error'`
- [x] 3.4 Implementar loop: `reconcile()` imediato no startup + `setInterval(reconcile, 10 * 60 * 1000)`
- [x] 3.5 Adicionar script `"supervisor"` ao `package.json`: `"bun run src/application/supervisor/supervisor.ts"`
- [x] 3.6 Adicionar serviço `supervisor` ao `docker-compose.yml` com `restart: always`

## 4. Verificação

- [x] 4.1 Testar `POST /api/admin/login` retorna JWT com `role: 'super_admin'`
- [x] 4.2 Testar que `GET /api/admin/workers` com token de tenant regular retorna 403
- [x] 4.3 Testar CRUD completo de workers via API
- [ ] 4.4 Testar que supervisor spawna processo ao cadastrar worker `active`
- [ ] 4.5 Testar que supervisor mata processo ao desativar worker
- [ ] 4.6 Testar que 5 crashes consecutivos desativam o worker (`status='error'`)
