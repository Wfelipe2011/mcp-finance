# Contexto 03 — Admin dentro do App + Roles de Usuário

## Objetivo desta rodada de explore

Trazer o painel admin para dentro do app principal (não mais separado), com:
- **Roles de usuário**: `owner`, `member`, `admin` (ou `super_admin`)
- **UI de admin** acessível via role, não via app separado
- **Parte admin** que existe hoje como app separado (`auth/`) integrada ao fluxo

---

## Situação atual

### Admin como app separado

```
auth/app/               ← App de autenticação separado
  src/index.ts          ← Servidor próprio
  openspec/             ← Changes de auth separadas

src/application/web/routes/admin/
  panel.ts              ← Endpoints de admin (métricas, status)
  tenants.ts            ← CRUD de tenants
  login.ts              ← Login admin separado
  pipeline-queues.ts    ← Fila de jobs (admin view)
  workers.ts            ← Status de workers
```

### Problema: dois apps, dois logins, experiência fragmentada

```
Hoje:
  Usuário → app em :5173 (finance)
  Admin   → app em :outra porta (auth/app)

Não faz sentido ter dois apps quando:
- É um produto de família (poucos usuários por tenant)
- O admin é o próprio dono da conta
- "Super admin" (Wilson) gerencia múltiplos tenants
```

---

## Modelo de roles proposto

```
Roles:
  owner   → dono do tenant (criou a conta)
            acessa tudo + pode convidar/remover membros
            
  member  → membro da família
            acessa dados financeiros do tenant
            NÃO pode gerenciar outros membros ou config avançada
            
  admin   → (super) admin do sistema
            acessa painel multi-tenant (todos os tenants)
            pode enfileirar jobs, ver logs, gerenciar modelos ML
            APENAS Wilson (ou quem tiver essa role)
```

### Fluxo de navegação por role

```
member:
  Dock: [Resumo] [Gastos] [Próx.] [IA] [Treinar]
  Config: apenas nome/perfil

owner:
  Dock: [Resumo] [Gastos] [Próx.] [IA] [Treinar]
  Config: nome, membros, convidar, permissões

admin (super):
  Dock: [Resumo] [Gastos] [Próx.] [IA] [Admin]
        ↑ "Treinar" é substituído por "Admin" para super_admin
  Admin screen: todos os tenants, filas, workers, pipeline
```

---

## O que vai para dentro do app

### Tela Admin (nova) — apenas role `admin`
```
Sub-abas:
  [ Tenants ] [ Filas ] [ Workers ] [ Modelos ML ]

Tenants:
  - Lista de todos os tenants
  - Status (ativo/inativo)
  - Último digest gerado
  - Enfileirar digest/enrich para tenant específico

Filas:
  - Contagem por tipo (enrich_jobs, digest_jobs, etc.)
  - Jobs em erro
  - Re-enfileirar / limpar

Workers:
  - Status do shared-worker
  - Último heartbeat
  - Jobs processados hoje

Modelos ML:
  - Versão em produção por tenant
  - Acurácia
  - Disparar re-treino
```

### Tela Settings expandida — role `owner`
```
Seções:
  [ Perfil ] [ Membros ] [ Integrações ]

Perfil:
  - Nome exibido
  - (futuro: foto de perfil)

Membros:
  - Lista de membros do tenant
  - Convidar novo membro (via email ou código)
  - Remover membro
  - Alterar role de member → owner (ou vice-versa)

Integrações:
  - Status do Pluggy (open banking)
  - Reconectar contas bancárias
```

---

## Questões para o explore

1. **Roles no banco**: existe coluna `role` na tabela de users hoje? Ou é apenas `tenant_id + user_id`?
2. **Auth service**: o serviço em `auth/app/` faz o login via Pluggy/OAuth. Como o role é transmitido no token JWT/session?
3. **Admin login separado**: `auth/app/routes/admin/login.ts` — isso some ou vira um role no sistema principal?
4. **Multi-tenant admin**: um usuário com role `admin` precisa trocar de tenant no UI ou vê todos de uma vez?
5. **Segurança**: como garantir que endpoints de admin (ex: `GET /admin/tenants`) não são acessíveis por usuários com role `member`?

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/application/web/routes/users.ts` | Adicionar campo role ao CRUD de usuários |
| `src/application/web/routes/admin/panel.ts` | Mover para rotas autenticadas por role |
| `src/application/web/routes/admin/tenants.ts` | Idem |
| `src/application/web/routes/admin/pipeline-queues.ts` | Idem |
| `src/application/web/routes/admin/workers.ts` | Idem |
| `src/infrastructure/db/BunPgAdapter.ts` | `users.getAll()`, adicionar `role` |
| `src/application/web/router.ts` | Middleware de role checking |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/App.tsx` | Dock condicional por role |
| `client/src/tabs/IaScreen.tsx` | Referência de sub-abas |
| `client/src/components/ConfigDialog.tsx` | Expandir para seções por role |
| `client/src/api/client.ts` | Endpoint `/api/users/me` com role |
| `client/src/api/types.ts` | Tipo `UserRole = 'owner' | 'member' | 'admin'` |

### Auth
| Arquivo | Papel |
|---|---|
| `auth/app/src/index.ts` | Entender como token é gerado (role precisa estar no payload) |

---

## Referências

- **DaisyUI Menu** (para nav admin): https://daisyui.com/components/menu/
- **DaisyUI Badge** (para indicar role): https://daisyui.com/components/badge/
- **DaisyUI Tabs** (sub-abas do admin): https://daisyui.com/components/tab/
- **DaisyUI Table** (lista de tenants, jobs): https://daisyui.com/components/table/
- **DaisyUI Stat** (contadores de filas, workers): https://daisyui.com/components/stat/

---

## Dependências com outros contextos

- **Contexto 01** (navegação): a tela Admin usa o mesmo sistema de navegação (Dock/Drawer) com itens condicionais por role
- **Contexto 02** (workers): a tela Admin mostra status do supervisor de workers
- **Contexto 04** (forecast sem ML): a tela Admin pode mostrar status das views SQL em vez do modelo .pkl

---

## Sugestão de escopo para a change

**Change 1 — Roles no backend:**
1. Adicionar coluna `role` na tabela `users` (migration)
2. Expor `role` no endpoint `/api/users/me`
3. Middleware de role no router para proteger rotas `/admin/*`
4. Seed: Wilson tem role `admin`, outros têm role `member`

**Change 2 — Tela Admin no frontend:**
1. Criar `client/src/tabs/AdminScreen.tsx`
2. Mostrar item "Admin" no Dock apenas para role `admin`
3. Sub-abas: Tenants, Filas, Workers
4. Consumir endpoints admin existentes (já existem no backend!)

**Change 3 — Settings expandido:**
1. Expandir `ConfigDialog.tsx` para mostrar seção "Membros" para `owner`
2. Interface de convite/remoção de membros
