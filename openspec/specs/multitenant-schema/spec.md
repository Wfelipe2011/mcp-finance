# Discovery: Multi-tenant Schema

> **Tipo:** Discovery  
> **Trilha:** A1 — base para toda a transformação multi-tenant  
> **Paralelo com:** Trilha B (worker-registry, enrich-queue, digest-gate)

---

## Contexto

O projeto hoje é uma POC single-tenant. As credenciais de acesso à Pluggy (`CLIENT_ID`, `CLIENT_SECRET`) e a senha da aplicação vivem em variáveis de ambiente. A meta é transformar isso em uma MVP multi-tenant, onde cada tenant tem seu próprio conjunto de credenciais e dados isolados.

O padrão de referência é o `territory-manager-v2`, que usa uma tabela `multi_tenancy` (alias `multitenancy`) com `tenant_id` em todas as tabelas. Aqui vamos chamar de `tenants`.

---

## O que sabemos hoje

### Tabelas existentes (db-schema/spec.md)
- `items` — dados de contas Pluggy
- `accounts` — contas bancárias
- `transactions` — transações financeiras
- `investments` — investimentos
- `investment_transactions` — movimentações de investimento
- `identities` — dados de identidade do usuário
- `ai_transaction_insights` — enriquecimento AI por transação

### Banco atual
- SQLite (`finance.db`) via `BunSQLiteAdapter`
- Schema inicializado via `schema.sql` com `CREATE TABLE IF NOT EXISTS`
- Sem migrations formais

---

## Questões de Discovery

### Q1 — Quais campos compõem a tabela `tenants`?
Sabemos que precisamos de:
- `id` (PK)
- `email` — email do dono/responsável
- `app_password` — senha que autentica a API Pluggy (hoje no .env: `CLIENT_ID`/`CLIENT_SECRET`)
- `login_password` — senha de acesso ao app (hoje no .env: `APP_PASSWORD` ou similar)
- `name` — nome para identificar o tenant
- `created_at`, `last_login_at`

**Dúvida:** `app_password` e `login_password` são realmente senhas separadas? O Pluggy usa `clientId` + `clientSecret` — são dois campos ou um par? Precisamos de hash ou armazenar em texto plano (criptografado no DB)?

### Q2 — Qual é a estratégia de migração do schema?
Hoje o banco é inicializado com `CREATE TABLE IF NOT EXISTS` idempotente. Para adicionar `tenant_id` em todas as tabelas existentes:

**Opção A: Migration destrutiva**  
Dropar e recriar. Viável em dev/POC, perde dados históricos.

**Opção B: `ALTER TABLE ... ADD COLUMN tenant_id`**  
Não destrutiva. SQLite suporta ADD COLUMN mas com limitações (NOT NULL sem DEFAULT é problema se há dados existentes). Pode exigir `DEFAULT 1` + `UPDATE` + remoção do DEFAULT depois.

**Opção C: Versioned migrations com Bun SQLite**  
Criar uma tabela `_migrations` e rodar scripts numerados. Mais robusto, mas adiciona complexidade.

**Hipótese:** Para MVP, Opção A é válida se definirmos que o tenant "legado" (o usuário atual) é o tenant 1 e re-sincronizamos os dados.

### Q3 — Em quais tabelas entra `tenant_id`?
Certamente: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `identities`, `ai_transaction_insights`.

**Dúvida:** As views (silver, gold) e tabelas derivadas também precisam de `tenant_id`? Ou o join com tabelas base já garante isolamento?

```
transactions (tenant_id) ──► f_transacoes (view derivada)
                                    │
                              WHERE t.tenant_id = ?  ← isso funciona via parâmetro?
```

### Q4 — Como o `tenant_id` entra nas queries existentes?
Hoje as queries não têm filtro de tenant. Com multi-tenancy, toda query precisa de `WHERE tenant_id = ?`. 

**Opção A: Row-Level Security (RLS)** — PostgreSQL suporta, SQLite não.  
**Opção B: Filtro explícito em cada query** — mais verboso mas simples.  
**Opção C: `SET LOCAL app.tenant_id = ?` + policy** — só PostgreSQL.

**Hipótese:** Já que estamos em SQLite (com planos de migrar para Postgres?), o caminho mais seguro é filtro explícito por enquanto.

### Q5 — Como o `tenant_id` chega ao contexto de execução?
- No sync/enrich scripts: via variável de ambiente ou argumento CLI `--tenant-id`
- Na API web: via JWT após autenticação
- Nos workers externos: via payload do job ou header da requisição

### Q6 — Precisamos migrar para PostgreSQL agora ou SQLite + tenant_id resolve?
O spec `postgres-adapter` já existe. A questão é: a transição para multi-tenant exige Postgres ou SQLite aguenta?

**Considerações:**
- SQLite não tem RLS → sem proteção de isolamento em nível de banco
- SQLite não tem conexões múltiplas simultâneas eficientes → workers concorrentes podem ter problemas de lock
- PostgreSQL tem suporte nativo a BullMQ (via Redis) + melhor concorrência

**Hipótese:** A migração para Postgres deveria ser pré-requisito para multi-tenancy em produção.

---

## Riscos e Incógnitas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Tabelas silver/gold sem `tenant_id` vazam dados entre tenants | Alto | Investigar se views precisam de filtro |
| SQLite locks com workers concorrentes | Médio | Considerar Postgres como prerequisito |
| Credenciais Pluggy em texto plano no DB | Alto | Definir estratégia de criptografia |
| Migração de dados históricos do tenant legado | Médio | Script de migração com `tenant_id = 1` default |

---

## O que "done" significa para este discovery

- [ ] Definir schema completo da tabela `tenants` (campos, tipos, constraints)
- [ ] Decidir estratégia de migration (destrutiva vs incremental)
- [ ] Listar todas as tabelas que recebem `tenant_id`
- [ ] Definir se Postgres é pré-requisito ou SQLite resolve no MVP
- [ ] Decidir como credenciais Pluggy são armazenadas (plaintext vs criptografado)
- [ ] Mapear impacto nas views silver/gold
