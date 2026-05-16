# Discovery: Super Admin Panel

> **Tipo:** Discovery  
> **Trilha:** C6 — painel de administração global  
> **Contexto necessário de:** A2 (tenant-lifecycle), B3 (worker-registry)  
> **Paralelo com:** B4, B5

---

## Contexto

O super admin é o operador do sistema — a pessoa que provisiona tenants, monitora workers e resolve problemas. O acesso é via credenciais no `.env` (não é um tenant comum). O painel deve ser uma tela simples, acessível via navegador, separada do app principal dos tenants.

O padrão de referência (`territory-manager-v2`) usa um `SUPER_ADMIN_ID` no `.env` e um role `super_admin` no JWT. A tela de admin renderiza via SSR (`@Render('tenants')` com Handlebars).

---

## O que sabemos hoje

### App atual
- Client React em `client/` (Vite + MUI)
- Server em `src/application/web/server.ts` (Bun.serve)
- Auth em serviço separado `auth/app/`
- Sem SSR hoje

### Referência territory-manager
- `GET /v1/admin/tenants` → renderiza página SSR (Handlebars)
- Role `SUPER_ADMIN` no JWT protege a rota
- Super admin pode ver lista de tenants, editar, trocar de tenant (`switchTenant`)

---

## Questões de Discovery

### Q1 — Como o super admin se autentica?

O super admin não é um tenant. Ele existe fora da tabela `tenants`. Opções:

**Opção A: Credenciais hardcoded no `.env`**
```
SUPER_ADMIN_EMAIL=admin@sistema.com
SUPER_ADMIN_PASSWORD=senha_secreta
```
Login em `POST /api/super/login` retorna JWT com `role: "super_admin"`. Simples, sem tabela extra.

**Opção B: Tabela `super_admins` no DB**  
Mais flexível, permite múltiplos super admins, mas adiciona complexidade.

**Opção C: Basic Auth via `.env` nas rotas admin**  
Header `Authorization: Basic base64(email:senha)` nas rotas `/api/admin/**`. Sem JWT, sem sessão.

**Hipótese:** **Opção A** — credenciais no `.env` + JWT com `role: "super_admin"`. Consistente com o padrão atual de auth e com o `territory-manager-v2`.

### Q2 — O painel é parte do React app ou uma página separada?

**Opção A: Parte do React app**  
Nova rota `/admin` no React protegida por `role: "super_admin"` no JWT. Componentes React.

**Opção B: Página SSR separada**  
`GET /admin` renderiza HTML estático/SSR no servidor. Mais simples, sem dependência do bundle React.

**Opção C: App separado (diferente porta/subdomínio)**  
`http://localhost:3002/admin`. Totalmente isolado.

**Hipótese:** **Opção A** — rota `/admin` no React app existente. O super admin tem o mesmo URL base, mas com acesso a abas/rotas extras. Evita duplicação de infra.

### Q3 — O que o painel precisa mostrar?

#### Seção: Tenants
- Lista de todos os tenants: Nome, Email, `last_login_at`, Status
- Ordenação: mais recente login primeiro
- Ações: Ativar/Desativar tenant

```
┌─────────────────────────────────────────────────────────────┐
│ Tenants                                           [+ Novo]  │
├────────────────┬──────────────────┬─────────────────┬──────┤
│ Nome           │ Email            │ Último login    │Status│
├────────────────┼──────────────────┼─────────────────┼──────┤
│ Família Silva  │ silva@email.com  │ Hoje 14:32      │ ✓   │
│ Família Santos │ santos@email.com │ Ontem 09:15     │ ✓   │
│ Família Costa  │ costa@email.com  │ Nunca           │ ✗   │
└────────────────┴──────────────────┴─────────────────┴──────┘
```

#### Seção: Workers
- Lista de todos os workers: Nome, URL, Status, Último erro
- Ações: Reativar worker inativo, Remover worker

```
┌───────────────────────────────────────────────────────────────────┐
│ Workers                                               [+ Novo]    │
├──────────┬───────────────────────────┬────────┬───────────────────┤
│ Nome     │ URL                       │ Status │ Último erro       │
├──────────┼───────────────────────────┼────────┼───────────────────┤
│ Worker 1 │ https://w1.io/enrich      │ ✓ ativo │ —               │
│ Worker 2 │ https://w2.io/enrich      │ ✗ inativo │ timeout 30s  │
│ Worker 3 │ https://w3.io/enrich      │ ✓ ativo │ —               │
└──────────┴───────────────────────────┴────────┴───────────────────┘
```

### Q4 — Quais ações o super admin pode fazer?

**Sobre tenants:**
- Criar novo tenant (POST)
- Listar todos os tenants com last_login
- Ativar/desativar tenant (PATCH status)
- Ver estatísticas básicas (total transações, último sync)

**Sobre workers:**
- Criar novo worker (nome, URL, api_key)
- Listar todos os workers
- Reativar worker inativo (PATCH status: 'active')
- Remover worker (DELETE — com confirmação)

**Não precisa (MVP):**
- Editar dados de um tenant
- Ver logs detalhados de jobs
- Monitoramento em tempo real da fila

### Q5 — Como proteger as rotas do super admin?

Na API:
```typescript
// Middleware que verifica role: "super_admin"
if (jwtPayload.role !== 'super_admin') {
  return 403 Forbidden
}
```

No React:
```tsx
// HOC ou guard que redireciona se não for super_admin
if (!isSuperAdmin) return <Navigate to="/" />
```

**Dúvida:** O `role: "super_admin"` vem no mesmo JWT dos tenants? Ou é um JWT diferente (outro endpoint de login)?

**Hipótese:** Mesmo JWT, campos diferentes:
```json
{
  "tenant_id": null,       // super admin não tem tenant
  "email": "admin@...",
  "role": "super_admin",
  "exp": ...
}
```

O middleware de tenant (`WHERE tenant_id = JWT.tenant_id`) precisa tratar `tenant_id = null` para super admin.

### Q6 — O super admin pode "entrar" num tenant para ver seus dados?

No `territory-manager-v2`, o super admin tem `switchTenant` — ele pode se logar como qualquer tenant para ver os dados daquele tenant.

Para esta MVP:
**Hipótese:** **Não implementar switchTenant por enquanto.** O super admin vê estatísticas globais mas não os dados financeiros de cada tenant. Privacidade.

### Q7 — Onde fica o link/acesso ao painel admin?

**Opção A:** Aparece no app principal apenas se o JWT tiver `role: "super_admin"` — ícone extra na navigation ou rota `/admin`.

**Opção B:** URL separada completamente — `localhost:3001/admin` sem vínculo com o app de tenant.

**Hipótese:** **Opção A** — aba extra no React app quando `isSuperAdmin`. O super admin usa o mesmo URL base.

---

## Diagrama de Autenticação Super Admin

```
POST /api/super/login { email, password }
         │
         ▼
  Verifica SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD do .env
         │
         ├── match → JWT { role: "super_admin", tenant_id: null }
         │
         └── no match → 401 Unauthorized

Rotas protegidas:
GET  /api/admin/tenants        ← lista todos os tenants
POST /api/admin/tenants        ← cria novo tenant
PATCH /api/admin/tenants/:id   ← ativa/desativa
GET  /api/admin/workers        ← lista todos os workers
POST /api/admin/workers        ← registra novo worker
PATCH /api/admin/workers/:id   ← reativa worker inativo
DELETE /api/admin/workers/:id  ← remove worker
```

---

## Riscos e Incógnitas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Credenciais super admin no .env expostas | Alto | HTTPS obrigatório, .env fora do repo |
| Super admin com tenant_id null quebra queries | Médio | Middleware trata null explicitamente |
| Rota /admin acessível sem autenticação | Alto | Guard no React + middleware no backend |
| Super admin vê dados financeiros de tenants | Médio | Endpoints de super admin só retornam metadados |

---

## O que "done" significa para este discovery

- [ ] Definir como super admin se autentica (.env + JWT ou Basic Auth)
- [ ] Decidir onde fica o painel (React route vs SSR vs app separado)
- [ ] Listar todas as funcionalidades do painel (tenant CRUD + worker management)
- [ ] Definir o formato do JWT de super admin (tenant_id null)
- [ ] Definir se super admin pode acessar dados de tenants (switchTenant)
- [ ] Mapear as rotas de API necessárias com seus guards
- [ ] Definir UX do botão/link de acesso ao painel (aba extra quando super_admin)
