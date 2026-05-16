## ADDED Requirements

### Requirement: Login super admin via env vars
O sistema SHALL ter endpoint `POST /api/admin/login` que compara `{ email, password }` com `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` do env via comparação timing-safe. Sucesso emite JWT com `{ sub: email, role: 'super_admin' }`. Rotas `/api/admin/*` SHALL exigir JWT com `role: 'super_admin'`.

#### Scenario: Login super admin bem-sucedido
- **WHEN** `POST /api/admin/login { email, password }` recebe credenciais corretas
- **THEN** retorna `{ token }` com JWT contendo `role: 'super_admin'`

#### Scenario: Credenciais incorretas
- **WHEN** `POST /api/admin/login` recebe email ou senha errados
- **THEN** retorna 401 com `{ error: "Credenciais inválidas" }`

#### Scenario: Acesso a rota admin sem role super_admin
- **WHEN** `GET /api/admin/workers` é chamado com JWT de tenant regular (sem `role: 'super_admin'`)
- **THEN** retorna 403 Forbidden

### Requirement: CRUD de workers via API
O sistema SHALL ter endpoints: `POST /api/admin/workers` (cria), `GET /api/admin/workers` (lista todos), `PATCH /api/admin/workers/:id` (atualiza name/status/ai_model/etc), `DELETE /api/admin/workers/:id` (remove). Todos exigem autenticação super admin.

#### Scenario: Cadastro de novo worker
- **WHEN** `POST /api/admin/workers { name, ai_base_url, ai_api_key, ai_model }` com auth super admin
- **THEN** cria registro em `workers` com `status='active'` e retorna `{ id, name, status, created_at }`

#### Scenario: Listagem de workers
- **WHEN** `GET /api/admin/workers` com auth super admin
- **THEN** retorna array com todos os workers incluindo `id`, `name`, `status`, `jobs_done`, `error_count`, `last_seen_at`

#### Scenario: Desativação de worker
- **WHEN** `PATCH /api/admin/workers/:id { status: "inactive" }` com auth super admin
- **THEN** atualiza `status='inactive'`; o supervisor para o processo na próxima reconciliação

#### Scenario: Remoção de worker
- **WHEN** `DELETE /api/admin/workers/:id` com auth super admin
- **THEN** remove o registro; o supervisor para o processo na próxima reconciliação

### Requirement: Supervisor gerencia processos filhos por delta
O sistema SHALL ter um processo supervisor que ao iniciar lê todos os workers `active` da tabela `workers` e os spawna como processos Bun filhos. A cada 10 minutos, lê novamente a tabela e: spawna workers novos `active` que não estão rodando; mata processos de workers que foram `inactive`/`error`/deletados. Workers `active` já rodando não são reiniciados.

#### Scenario: Novo worker cadastrado
- **WHEN** um worker é cadastrado como `active` e o supervisor executa o próximo reconcile
- **THEN** o supervisor spawna um processo filho com as env vars do worker (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `WORKER_ID`)

#### Scenario: Worker desativado pelo admin
- **WHEN** um worker é atualizado para `status='inactive'` e o supervisor executa o próximo reconcile
- **THEN** o supervisor mata o processo filho correspondente

### Requirement: Auto-deactivação por crashes em série
O sistema SHALL detectar quando um processo filho sai com código não-zero, incrementar `workers.error_count` e atualizar `last_seen_at`. Quando `error_count >= 5`, SHALL atualizar `workers.status = 'error'` e não reiniciar o processo.

#### Scenario: Worker crasha uma vez
- **WHEN** um processo filho sai com código não-zero e `error_count < 5`
- **THEN** `error_count` é incrementado; o worker será reiniciado no próximo reconcile

#### Scenario: Worker crasha 5 vezes
- **WHEN** `error_count` atinge 5
- **THEN** `workers.status = 'error'`; o worker não é mais reiniciado até o admin resetar para `active`
