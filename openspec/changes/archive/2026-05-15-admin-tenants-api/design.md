## Context

O painel super admin (`GET /admin`) já está implementado com HTML+JS que chama `/api/admin/tenants` para listar, criar e alterar status de tenants. O backend não implementou esses endpoints — o testing gate falha em A8, A9 e A10. A tabela `tenants` já existe com schema completo: `id`, `name`, `email`, `password_hash`, `pluggy_email`, `pluggy_password`, `status` (active/suspended), `created_at`, `last_login_at`.

O padrão de auth admin já está estabelecido pelo `worker-registry`: `requireSuperAdmin` no início de cada handler, e `BunPgAdapter` com métodos no objeto da property correspondente.

## Goals / Non-Goals

**Goals:**
- Implementar `GET /api/admin/tenants` — retorna todos os tenants (sem password_hash)
- Implementar `POST /api/admin/tenants` — cria tenant com password_hash via `bcrypt` ou hash compatível
- Implementar `PATCH /api/admin/tenants/:id` — altera `status` (active → suspended → active)
- Todos os 3 endpoints protegidos por `requireSuperAdmin`
- Adicionar métodos `tenants.findAll()`, `tenants.create()`, `tenants.setStatus()` ao `BunPgAdapter`

**Non-Goals:**
- UI do painel (já implementada em `panel.ts`)
- Endpoint de DELETE de tenant (não está no painel)
- Endpoints de tenant individual por admin

## Decisions

### Hash de senha na criação de tenant

O `BunPgAdapter` já usa `bcryptjs` para users. A mesma biblioteca deve ser usada para `password_hash` de tenant no `POST /api/admin/tenants`.

**Alternativa considerada:** Receber hash já pronto do cliente — rejeitado, o backend deve ser responsável pelo hash.

### Status permitidos

A tabela já tem CHECK `status IN ('active', 'suspended')`. O PATCH aceita apenas esses dois valores e retorna 400 para qualquer outro.

**Observação:** O painel chama `PATCH` com `{ status: "inactive" }` — mas o schema usa `suspended`. O handler deve aceitar `inactive` como alias de `suspended` para compatibilidade com o painel já implementado.

### Campos retornados na listagem

`password_hash`, `pluggy_password` e `pluggy_email` são sensíveis. O handler retorna apenas: `id`, `name`, `email`, `status`, `created_at`, `last_login_at`.

## Risks / Trade-offs

- [Alias `inactive → suspended`] O painel envia `inactive` mas o DB aceita apenas `suspended`. O handler normaliza no server-side. Risco: inconsistência futura se o schema mudar. Mitigação: documentado no handler.
- [bcrypt no handler admin] A criação de tenant hash a senha — operação lenta. Para MVP, aceitável (tenants criados raramente pelo super admin).
