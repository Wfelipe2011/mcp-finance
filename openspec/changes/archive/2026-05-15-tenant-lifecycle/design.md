## Context

O sistema tem schema multi-tenant (`tenants` table com `id`, `name`, `email`, `password_hash`, `pluggy_email`, `pluggy_password`, `status`, `last_login_at`) e autenticação JWT com `tenant_id`. Falta o mecanismo para o super admin criar e gerenciar tenants. O super admin já tem auth próprio via `POST /api/admin/login` (worker-registry change) com JWT `{ role: 'super_admin', tenant_id: null }`.

## Goals / Non-Goals

**Goals:**
- `POST /api/admin/tenants` — cria tenant com todos os campos obrigatórios
- `GET /api/admin/tenants` — lista todos os tenants com metadados básicos
- `PATCH /api/admin/tenants/:id` — ativa ou desativa tenant
- Métodos correspondentes em `BunPgAdapter` sem RLS (super admin enxerga todos)

**Non-Goals:**
- Edição de credenciais Pluggy após criação (pós-MVP)
- switchTenant — super admin não acessa dados financeiros de tenants
- Auto-registro público de tenants
- Auditoria de ações do super admin

## Decisions

### D1 — Todos os campos obrigatórios na criação
`POST /api/admin/tenants` rejeita com 400 se faltar qualquer campo: `name`, `email`, `password`, `pluggy_email`, `pluggy_password`. Sem estado "incompleto" de tenant.

### D2 — bcrypt para password, plaintext para pluggy_password
`password` passa por `bcrypt.hash()` antes de salvar. `pluggy_password` salvo em plaintext (MVP — sem criptografia). Consistente com decisão anterior do projeto.

### D3 — BunPgAdapter sem SET LOCAL para rotas admin
Métodos `tenants.*` em `BunPgAdapter` são chamados com `tenantId: null` (super admin). Esses métodos NÃO emitem `SET LOCAL app.tenant_id` — a tabela `tenants` não tem RLS, então a query funciona sem o setting.

### D4 — Rotas no router.ts principal, sem sub-router
Consistente com a escolha "mais simples". As 3 rotas `/api/admin/tenants*` são adicionadas diretamente no `router.ts` existente junto com as demais rotas admin.

### D5 — PATCH só altera status
`PATCH /api/admin/tenants/:id { status: "active" | "inactive" }`. Nenhum outro campo é editável via API no MVP. Reduz superfície de ataque e complexidade.

### D6 — Email único — constraint no banco, erro 409 na API
`tenants.email` tem UNIQUE constraint no schema. O handler captura violação de constraint e retorna `409 Conflict { error: "Email já cadastrado" }`.

### D7 — Resposta da criação não inclui password_hash nem pluggy_password
`POST /api/admin/tenants` retorna: `{ id, name, email, status, created_at }`. Campos sensíveis nunca saem na resposta.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| pluggy_password em plaintext | Decisão de MVP — sem criptografia por ora |
| Super admin com tenant_id: null chamando métodos com RLS ativo | Métodos `tenants.*` nunca emitem SET LOCAL; tabela não tem RLS |
| Email duplicado sem mensagem clara | D6 — 409 com mensagem específica |
| Tenant desativado ainda tem JWT válido | Token expira naturalmente; middleware pode checar status no banco (pós-MVP) |
