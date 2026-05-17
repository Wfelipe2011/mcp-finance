# Discovery: Worker Registry

> **Tipo:** Discovery  
> **Trilha:** B3 — registro e gestão de workers de enrich  
> **Paralelo com:** Trilha A (multitenant-schema, tenant-lifecycle)  
> **Pré-requisito de:** B4 (enrich-queue)

---

## Contexto

Hoje o enrich roda como script local (`bun run enrich`). A proposta é ter workers **externos** — processos em endereços diferentes (URLs) que o sistema pode chamar para processar transações. O servidor principal mantém um registro desses workers: URL, nome, API key, status ativo/inativo.

Quando um worker falha (erro HTTP 5xx, timeout, resposta inválida), ele é automaticamente desativado. Um super admin pode reativá-lo via painel.

---

## O que sabemos hoje

### Enrich atual (`ai-enrich-pipeline/spec.md`)
- Script `bun run enrich --limit N`
- Seleciona transações de `f_transacoes` ausentes em `ai_transaction_insights`
- Ordena por `date_day ASC` (mais antigo primeiro — **isso vai mudar**)
- Persiste resultado em `ai_transaction_insights`
- Erro em uma transação não para o pipeline

### O que muda com workers externos
```
ANTES:
  bun run enrich → chama AI diretamente → persiste no DB

DEPOIS:
  Orchestrator → seleciona transação → chama Worker (HTTP) → Worker chama AI → persiste
                                              │
                                    Worker falha? → desativa worker no DB
```

---

## Questões de Discovery

### Q1 — Qual é o schema da tabela `workers`?

```sql
CREATE TABLE workers (
  id         TEXT PRIMARY KEY,  -- UUID
  tenant_id  TEXT NOT NULL,     -- workers são por tenant ou globais?
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,     -- ex: https://worker1.minhacasa.com/enrich
  api_key    TEXT NOT NULL,     -- chave enviada no header Authorization
  status     TEXT NOT NULL DEFAULT 'active',  -- active | inactive
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT,              -- último erro recebido
  error_at   TEXT               -- quando o último erro ocorreu
);
```

**Dúvida crítica:** Workers são globais (compartilhados entre tenants) ou cada tenant tem seus próprios workers?

- **Workers globais:** Mais simples, mas o worker precisa receber o `tenant_id` no payload para saber qual banco processar. O orchestrator distribui jobs de todos os tenants entre os workers globais.
- **Workers por tenant:** Cada tenant registra seus próprios workers. Mais isolado, mais complexo.

**Hipótese:** Workers **globais** para MVP — o orchestrator injeta `tenant_id` no payload do job. Isso simplifica o registry e o painel de super admin.

### Q2 — Quais endpoints são necessários?

```
POST   /api/admin/workers         ← criar worker (super admin)
GET    /api/admin/workers         ← listar workers com status
PATCH  /api/admin/workers/:id     ← mudar status (ativar/desativar)
DELETE /api/admin/workers/:id     ← remover worker (opcional)
```

**Dúvida:** O endpoint de criação é só para super admin ou para admins de tenant também?

### Q3 — Como o worker é autenticado pelo servidor principal?
O orchestrator chama `POST worker.url` com:
```json
{
  "transaction_id": "...",
  "tenant_id": "...",
  "description": "Supermercado Extra",
  "amount": -150.00,
  "date": "2026-05-15"
}
```
Header: `Authorization: Bearer <worker.api_key>`

**Dúvida:** O worker valida a api_key? Ou a api_key é só para o worker autenticar-se **de volta** no servidor principal (para reportar resultado)?

**Hipótese A:** A api_key é enviada no request ao worker para que o worker saiba que é o servidor principal chamando. O worker responde com o resultado.

**Hipótese B:** O worker é "fire and forget" — recebe o job, processa assincronamente e chama de volta o servidor com o resultado usando a api_key como Bearer token.

**Hipótese A é mais simples para MVP.**

### Q4 — O que acontece quando um worker falha?
Critérios de falha:
- HTTP 5xx na chamada
- Timeout (> N segundos)
- Resposta com JSON inválido / campos obrigatórios ausentes

Ação: `UPDATE workers SET status = 'inactive', last_error = ?, error_at = NOW() WHERE id = ?`

**Dúvida:** Quantas falhas consecutivas antes de desativar? Uma só? Três?

**Hipótese:** 1 falha = desativa imediatamente. O super admin reativa manualmente. Simples e seguro.

### Q5 — Como o orchestrator seleciona qual worker usar?
Com múltiplos workers ativos, qual pega o próximo job?

**Opção A: Round-robin** — distribui igualmente.  
**Opção B: Least-busy** — chama o worker com menor carga. Requer tracking de jobs ativos por worker.  
**Opção C: Primeiro disponível** — pega o primeiro worker ativo na lista.

**Hipótese:** Para MVP, **Opção C** (primeiro ativo). Evolui para round-robin depois.

### Q6 — O que o worker precisa expor?
O worker é um serviço HTTP externo que expõe ao menos:
```
POST /enrich
  Body: { transaction_id, tenant_id, description, amount, date, ... }
  Header: Authorization: Bearer <api_key>
  Response: { 
    transaction_id,
    merchant_name, 
    category,
    is_debt_related,
    model_version
  }
```

**Dúvida:** O worker acessa o banco diretamente para persistir, ou retorna o resultado e o servidor principal persiste?

**Hipótese forte:** O worker **retorna o resultado** e o servidor principal persiste em `ai_transaction_insights`. Isso mantém o banco centralizado e simplifica os workers (sem acesso a DB, sem credenciais de DB nos workers).

---

## Diagrama do Worker Registry

```
┌──────────────────────────────────────────────────────────┐
│                     workers table                        │
├─────────┬─────────────────────────┬───────┬─────────────┤
│   id    │          url            │status │  last_error  │
├─────────┼─────────────────────────┼───────┼─────────────┤
│ w1      │ https://worker1.io/enr  │active │  null        │
│ w2      │ https://worker2.io/enr  │inactive│ "timeout"  │
│ w3      │ https://worker3.io/enr  │active │  null        │
└─────────┴─────────────────────────┴───────┴─────────────┘
                         │
              ┌──────────┴──────────┐
              │   Orchestrator      │
              │ selects w1 or w3    │
              │ (skips inactive w2) │
              └─────────────────────┘
```

---

## Riscos e Incógnitas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| API key armazenada em texto plano no DB | Alto | Hash ou criptografia simétrica |
| Worker malicioso (URL comprometida) recebe dados de transações | Alto | Validar HTTPS obrigatório, allowlist de domínios? |
| Todos os workers ficam inativos → enrich para | Médio | Alertas, fallback para enrich local |
| Worker lento bloqueia o orchestrator | Médio | Timeout configurável por worker |

---

## O que "done" significa para este discovery

- [ ] Decidir se workers são globais ou por tenant
- [ ] Definir schema completo da tabela `workers`
- [ ] Definir os 3-4 endpoints de gerenciamento
- [ ] Definir protocolo de chamada ao worker (payload, header, response)
- [ ] Definir quem persiste o resultado (worker vs servidor principal)
- [ ] Definir critério de falha (1 erro = desativa? N erros?)
- [ ] Decidir estratégia de seleção de worker (round-robin vs first-active)
- [ ] Definir como api_key é armazenada de forma segura

---

## Requirements (implementados em worker-registry — 2026-05-15)

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
- **THEN** cria registro em `workers` com `status='idle'` e retorna `{ id, name, status, created_at }`

#### Scenario: Listagem de workers
- **WHEN** `GET /api/admin/workers` com auth super admin
- **THEN** retorna array com todos os workers incluindo `id`, `name`, `status`, `jobs_done`, `error_count`, `last_seen_at`

#### Scenario: Atualização de worker
- **WHEN** `PATCH /api/admin/workers/:id { status: "offline" }` com auth super admin
- **THEN** atualiza o campo e retorna o worker atualizado; o supervisor para o processo na próxima reconciliação

#### Scenario: Remoção de worker
- **WHEN** `DELETE /api/admin/workers/:id` com auth super admin
- **THEN** remove o registro; o supervisor para o processo na próxima reconciliação

### Requirement: Supervisor Bun gerencia processos filhos por delta
O sistema SHALL ter `src/application/supervisor/supervisor.ts` que ao iniciar le todos os workers com `status IN ('idle', 'busy')` e os spawna como processos Bun filhos via `Bun.spawn()`. Cada processo filho SHALL executar um worker compartilhado apto a consumir multiplas filas (enrich, digest e forecast). A cada 10 minutos reconcilia: spawna novos workers ativos, mata processos de workers removidos/inativos.

#### Scenario: Novo worker cadastrado
- **WHEN** um worker esta ativo e o supervisor executa o proximo reconcile
- **THEN** o supervisor spawna um processo filho com env vars do worker (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `WORKER_ID`, `DATABASE_URL`)
- **THEN** o processo iniciado pode consumir jobs de enrich, digest e forecast

#### Scenario: Worker desativado pelo admin
- **WHEN** um worker sai do status `idle|busy` e o supervisor executa o proximo reconcile
- **THEN** o supervisor mata o processo filho correspondente

### Requirement: Auto-deactivação por crashes em série
O sistema SHALL detectar quando um processo filho sai com código não-zero, incrementar `workers.error_count`. Quando `error_count >= 5`, SHALL atualizar `workers.status = 'error'` e não reiniciar o processo.

#### Scenario: Worker crasha uma vez
- **WHEN** um processo filho sai com código não-zero e `error_count < 5`
- **THEN** `error_count` é incrementado; o worker é elegível para respawn no próximo reconcile

#### Scenario: Worker crasha 5 vezes
- **WHEN** `error_count` atinge 5
- **THEN** `workers.status = 'error'`; o worker não é mais reiniciado até o admin resetar para `idle`

## ADDED Requirements

### Requirement: Selecao de fila por rotacao no worker compartilhado
O worker compartilhado SHALL aplicar politica de rotacao entre tipos de fila suportados para evitar starvation, com fallback para a proxima fila disponivel quando a fila corrente estiver vazia.

#### Scenario: Rotacao com multiplas filas pendentes
- **WHEN** existem jobs pendentes em duas ou mais filas
- **THEN** o worker alterna o tipo de fila priorizado entre iteracoes consecutivas

#### Scenario: Fallback quando fila priorizada esta vazia
- **WHEN** a fila da vez na rotacao nao possui jobs pendentes
- **THEN** o worker tenta claimar na proxima fila da rotacao sem encerrar o loop
