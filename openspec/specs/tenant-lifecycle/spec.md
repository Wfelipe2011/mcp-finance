# Discovery: Tenant Lifecycle

> **Tipo:** Discovery  
> **Trilha:** A2 — gestão de tenants (depende de A1: multitenant-schema)  
> **Paralelo com:** Trilha B

---

## Contexto

Tendo o schema multi-tenant definido (A1), precisamos entender como tenants são criados, autenticados e gerenciados. Hoje o "tenant" é implícito — um único usuário com credenciais no `.env`. A transição para múltiplos tenants exige:

1. Um endpoint para criar novos tenants (com email, senha login, credenciais Pluggy)
2. Autenticação por tenant (login → JWT com `tenant_id`)
3. Tracking de `last_login_at` para o painel admin

---

## O que sabemos hoje

### Autenticação atual (`auth/` service)
O projeto já tem um serviço de auth separado (`auth/app/`) que:
- Valida credenciais via JWT
- Tem endpoints de login
- Armazena sessões em `auth/data/sessions.json`

### Fluxo atual (single-tenant)
```
.env (APP_PASSWORD, CLIENT_ID, CLIENT_SECRET)
        │
        ▼
  POST /api/auth/login
        │
        ▼
     JWT token
        │
        ▼
  todas as rotas protegidas
```

### Fluxo desejado (multi-tenant)
```
POST /api/tenants  ← cria tenant + primeiro usuário admin
        │
        ▼
POST /api/auth/login { email, password }
        │
        ▼
JWT { tenant_id, email, role }
        │
        ▼
todas as rotas filtram por tenant_id do JWT
```

---

## Questões de Discovery

### Q1 — Quem pode criar um tenant?
**Opção A: Endpoint público** — qualquer um pode se registrar (self-service SaaS).  
**Opção B: Só SUPER_ADMIN cria** — controlado, ideal para MVP onde você conhece todos os usuários.  
**Opção C: Script de bootstrap** — `bun run create-tenant` via CLI.

O território-manager usa os três: registro público para o usuário final, admin cria admins do tenant, super_admin gerencia todos os tenants. Para esta MVP, a combinação B + C parece mais adequada — o super admin provisiona tenants, e cada tenant gerencia seus próprios dados.

**Hipótese:** Endpoint `POST /api/admin/tenants` protegido por credenciais de super admin (via `.env: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD`).

### Q2 — Quais campos fazem parte do cadastro de tenant?
Mínimo:
```json
{
  "name": "Família Silva",
  "email": "silva@email.com",
  "login_password": "senha do app",
  "pluggy_client_id": "xxx",
  "pluggy_client_secret": "yyy"
}
```

**Dúvida:** `pluggy_client_id` e `pluggy_client_secret` são armazenados no DB (encriptados)? Ou o fluxo é: o super admin configura via `.env` e cada tenant "herda" as credenciais Pluggy globais?

**Ponto importante:** A ideia original mencionou "email e senha app hoje usamos no .env". Isso sugere que cada tenant tem suas próprias credenciais Pluggy — o que faz sentido para isolamento real (cada família tem sua própria conta Pluggy).

### Q3 — Como funciona o login por tenant?
Hoje: `POST /api/auth/login { password }` — sem distinguir tenant.

Com multi-tenant, precisamos que o login identifique o tenant. Opções:

**Opção A: Login por email** — `{ email, password }` → lookup na tabela `tenants` → JWT com `tenant_id`.  
**Opção B: Login por email + nome do tenant** — útil se um email puder ter múltiplos tenants.  
**Opção C: Subdomain** — `tenant1.app.com` define o tenant automaticamente. Complexidade maior.

**Hipótese:** Opção A é suficiente para MVP. Email é único por tenant.

### Q4 — O JWT precisa conter o que?
```typescript
{
  tenant_id: string,
  email: string,
  role: "admin" | "super_admin",
  exp: number
}
```

O `tenant_id` no JWT é a chave que filtra todos os dados. O middleware de auth extrai o `tenant_id` e injeta no contexto de cada request.

### Q5 — Como rastrear `last_login_at`?
A tabela `tenants` deve ter `last_login_at TIMESTAMP`. No endpoint de login, após autenticação bem-sucedida:
```sql
UPDATE tenants SET last_login_at = NOW() WHERE id = ?
```

**Dúvida:** Isso deve ser feito de forma síncrona (bloqueando o response) ou assíncrona (fire-and-forget)?

### Q6 — Listagem de tenants para o super admin
O painel super admin precisa listar todos os tenants com:
- Nome
- Email  
- `last_login_at`
- Status (ativo/inativo)

**Ordenação:** Do mais recente ao mais antigo (`last_login_at DESC NULLS LAST`).

### Q7 — Como lidar com a migração do "tenant legado"?
O usuário atual (você) deve se tornar o `tenant_id = 1` automaticamente. O script de migração (da A1) popula `tenant_id = 1` em todas as linhas existentes e cria o registro na tabela `tenants` com as credenciais atuais do `.env`.

---

## Diagrama do Fluxo de Autenticação Multi-tenant

```
┌─────────────────────────────────────────────────────────┐
│                   POST /api/auth/login                  │
│                   { email, password }                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  SELECT * FROM tenants │
              │  WHERE email = ?       │
              └────────────┬───────────┘
                           │ found?
                  ┌────────┴────────┐
                  │ YES             │ NO
                  ▼                 ▼
         verify password       401 Unauthorized
                  │
                  ▼
         UPDATE last_login_at
                  │
                  ▼
         sign JWT { tenant_id, email, role }
                  │
                  ▼
         return { token }
```

---

## Riscos e Incógnitas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Email duplicado em tenants diferentes | Médio | UNIQUE constraint em `tenants.email` |
| Credenciais Pluggy expostas no DB | Alto | Criptografia simétrica (AES via master key no .env) |
| Migração do tenant legado falha | Médio | Script de migração com rollback |
| Token sem `tenant_id` vaza para tenant errado | Alto | Middleware que rejeita tokens sem `tenant_id` |

---

## O que "done" significa para este discovery

- [ ] Definir quem pode criar tenants (super admin only vs auto-registro)
- [ ] Definir payload de criação de tenant (campos obrigatórios)
- [ ] Decidir se credenciais Pluggy são por tenant ou globais
- [ ] Definir payload do JWT multi-tenant
- [ ] Definir como `last_login_at` é atualizado (sync vs async)
- [ ] Mapear impacto no middleware de autenticação existente
- [ ] Planejar script de migração do tenant legado para `tenant_id = 1`
