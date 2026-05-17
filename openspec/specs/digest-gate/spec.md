## ADDED Requirements

### Requirement: Gate de geração de digest usa cobertura mínima de 80%
A elegibilidade para geração de digest mensal SHALL usar a razão de cobertura `enriched / total` por tenant e mês, com critério `total > 0` e `coverage >= 0.80`.

#### Scenario: Tenant com cobertura acima de 80% fica elegível
- **WHEN** um tenant tem `total=88` e `enriched=87` no mês alvo
- **THEN** a cobertura calculada é considerada elegível para geração de digest

#### Scenario: Tenant com cobertura abaixo de 80% não fica elegível
- **WHEN** um tenant tem `total=100` e `enriched=79` no mês alvo
- **THEN** o tenant não é elegível para geração de digest

#### Scenario: Mês sem transações não é elegível
- **WHEN** um tenant tem `total=0` no mês alvo
- **THEN** o tenant não é elegível para geração de digest

### Requirement: Gate de cobertura deve ser consistente em todos os pontos de decisão
O sistema SHALL aplicar o mesmo critério (`coverage >= 0.80` e `total > 0`) no enqueue manual de digest, no cron de digest e na validação final do worker antes da geração.

#### Scenario: Enqueue manual e cron tomam a mesma decisão
- **WHEN** um tenant tem cobertura de 85% no mês alvo
- **THEN** o enqueue manual e o cron consideram o tenant elegível

#### Scenario: Worker aplica o mesmo gate antes de processar
- **WHEN** um job de digest é claimado para tenant com cobertura de 75%
- **THEN** o worker marca o job como skipped sem gerar digest

### Requirement: GET /api/digest não chama AI — lê apenas do banco
O endpoint `GET /api/digest?month=YYYY-MM` SHALL nunca invocar o modelo AI diretamente. Se o digest não existe no banco, retorna `{ status: "pending", coverage: <float> }`. O endpoint é read-only em relação a `ai_monthly_digest`.

#### Scenario: Endpoint não dispara AI em nenhum caso
- **WHEN** `GET /api/digest?month=2026-05` é chamado e o digest não existe
- **THEN** a resposta é imediata com `{ status: "pending" }` — nenhuma chamada ao modelo é feita

### Requirement: Cobertura calculada em query única com LEFT JOIN
O endpoint SHALL calcular a cobertura como `COUNT(ai.transaction_id)::float / COUNT(*)` via LEFT JOIN de `f_transacoes` com `ai_transaction_insights`, retornando `0` se `COUNT(*) = 0`.

#### Scenario: Mês sem transações retorna coverage = 0
- **WHEN** `GET /api/digest?month=2025-01` é chamado e não há transações
- **THEN** retorna `{ status: "pending", coverage: 0 }`

#### Scenario: Cobertura parcial retornada corretamente
- **WHEN** 3 de 10 transações têm insight
- **THEN** retorna `{ status: "pending", coverage: 0.3 }`

> **Tipo:** Discovery  
> **Trilha:** B5 — gate para liberar o fluxo de digest  
> **Paralelo com:** A1, A2, B3, B4  
> **Independente:** Não tem dependência forte das outras trilhas para exploração

---

## Contexto

Hoje o digest (`ai-digest-pipeline`) processa transações para gerar resumos e insights financeiros. O problema: se o enrich ainda não completou para todas as transações, o digest usa dados incompletos.

A proposta: **o digest de um tenant só fica disponível após o enrich de TODAS as transações daquele tenant estar completo**.

---

## O que sabemos hoje

### Pipeline atual de enrich
- Seleciona transações em `f_transacoes` ausentes em `ai_transaction_insights`
- Processa uma por vez (limite configurável)
- Não tem noção de "completude" por tenant

### Pipeline atual de digest
- Spec `ai-digest-pipeline` gera resumos agregados
- Consome `ai_transaction_insights` como input
- Sem verificação se o enrich está completo

### Tabelas relevantes
```
transactions (id, tenant_id, date, ...)
ai_transaction_insights (transaction_id, tenant_id, analyzed_at, ...)
```

---

## Questões de Discovery

### Q1 — O que significa "enrich completo" para um tenant?

Definição candidata:
> Todas as transações do tenant presentes em `transactions` (ou `f_transacoes`) também estão presentes em `ai_transaction_insights`.

```sql
-- Verifica se há transações pendentes de enrich para um tenant
SELECT COUNT(*) as pending
FROM transactions t
LEFT JOIN ai_transaction_insights i ON t.id = i.transaction_id
WHERE t.tenant_id = ?
  AND i.transaction_id IS NULL
```

Se `pending = 0` → enrich completo → digest liberado.

**Dúvida:** "Todas as transações" inclui as mais antigas também? Ou só as do mês atual?

**Hipótese:** Para o digest mensal ser correto, o escopo é: todas as transações **do mês do digest**. Um digest de Maio/2026 requer enrich completo das transações de Maio/2026.

```sql
-- Escopo mensal
WHERE t.tenant_id = ?
  AND strftime('%Y-%m', t.date) = '2026-05'
  AND i.transaction_id IS NULL
```

### Q2 — Como o sistema sabe que o digest está "bloqueado"?

**Opção A: Check on-demand** — quando o usuário solicita o digest, o sistema verifica se o enrich está completo. Se não, retorna `202 Accepted` com status "processing" em vez dos dados.

**Opção B: Flag no banco** — tabela `digest_readiness` com `{ tenant_id, month, is_ready, checked_at }`. O orchestrator atualiza esta flag após cada job de enrich completar.

**Opção C: Estado derivado (computed)** — sem tabela extra. Sempre calcula na hora da requisição via query COUNT.

**Hipótese:** **Opção C** para MVP — sem tabela extra. A query é simples e o resultado é sempre fresco. Se o custo de performance for alto, evoluímos para Opção B com cache.

### Q3 — Qual é o comportamento do endpoint de digest quando bloqueado?

**Opção A: Retorna erro**
```json
HTTP 423 Locked
{ "error": "enrich_incomplete", "pending": 47, "message": "Aguardando enrich de 47 transações" }
```

**Opção B: Retorna dados parciais com flag**
```json
HTTP 200
{
  "status": "partial",
  "enrich_complete": false,
  "pending_transactions": 47,
  "data": { ...digest parcial... }
}
```

**Opção C: Retorna digest do cache anterior** enquanto o novo está sendo processado.

**Hipótese:** **Opção A** é mais honesta. O cliente (React app) exibe uma tela de "Processando..." quando recebe `423`. Simples e sem ambiguidade.

### Q4 — O digest deve ser disparado automaticamente quando o enrich completa?

**Cenário atual:** usuário pede digest → sistema calcula na hora.

**Cenário proposto:** 
1. Enrich do mês completa
2. Orchestrator detecta `pending = 0` para o mês
3. Orchestrator dispara geração do digest automaticamente
4. Resultado é cacheado
5. Próxima requisição do usuário retorna o cache

**Dúvida:** O digest é caro (chama AI para gerar resumo)? Se sim, pré-calcular faz sentido. Se é leve (só agregações SQL), calcular on-demand é suficiente.

**Hipótese:** O digest envolve chamadas AI (`ai-digest-pipeline` usa modelos) — então **pré-calcular** após enrich completo faz mais sentido.

### Q5 — Onde armazenar o status de "enrich completo por mês/tenant"?

Se adotarmos pré-cálculo (Q4), precisamos saber quando o último job de enrich de um mês/tenant completou.

**Opção A: Tabela `enrich_status`**
```sql
CREATE TABLE enrich_status (
  tenant_id TEXT NOT NULL,
  month     TEXT NOT NULL,  -- '2026-05'
  total     INTEGER NOT NULL,
  enriched  INTEGER NOT NULL,
  completed_at TEXT,        -- NULL se incompleto
  PRIMARY KEY (tenant_id, month)
);
```

**Opção B: Query derivada** — sem tabela extra, sempre conta na hora.

**Hipótese:** **Opção B** para MVP. Adicionar `enrich_status` quando performance demandar.

### Q6 — O que acontece se uma nova transação chega após o enrich "completar"?

Cenário:
1. Enrich completa para Maio → digest é gerado
2. Um sync traz 3 transações novas de Maio (retroativas/ajustes)
3. O digest de Maio ficou desatualizado

**Opções:**
- **Invalidar o cache** → próxima requisição recalcula
- **Re-processar automaticamente** → dispara enrich + digest novamente
- **Marcar como "stale"** → retorna dado com flag `"data_may_be_stale": true`

**Hipótese:** Invalidar o cache + re-processar automaticamente se a diferença for > N transações. Para MVP, apenas invalidar cache e exibir "Processando..." de novo.

---

## Diagrama do Fluxo Digest Gate

```
┌──────────────────────────────────────────────────────────────┐
│                   GET /api/digest/:month                     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ COUNT pending enrich for month │
              │ WHERE tenant_id = JWT.tenant   │
              └────────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ pending = 0?        │ pending > 0?
                    ▼                    ▼
          ┌──────────────────┐    ┌─────────────────────┐
          │  Return digest   │    │  HTTP 423            │
          │  (cached or new) │    │  { pending: N }      │
          └──────────────────┘    └─────────────────────┘
```

```
Após cada job de enrich completar:
                               │
                               ▼
              ┌────────────────────────────────┐
              │ COUNT pending for tenant/month │
              └────────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ pending = 0?        │
                    ▼                    
          ┌──────────────────────────────┐
          │  Dispara geração do digest   │
          │  Armazena resultado em cache │
          └──────────────────────────────┘
```

---

## Riscos e Incógnitas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Enrich nunca completa (worker inativo) | Alto | Alertas + timeout do gate |
| Transações retroativas invalidam digest | Médio | Política de re-processamento |
| Query COUNT em tabela grande é lenta | Médio | Índice em `(tenant_id, transaction_id)` |
| Digest desatualizado sem o usuário saber | Médio | Flag `generated_at` + `is_stale` na resposta |

---

## O que "done" significa para este discovery

- [ ] Definir o escopo exato de "enrich completo" (todas as transações vs mês corrente)
- [ ] Decidir se o gate é on-demand (query) ou materializado (tabela de status)
- [ ] Definir o comportamento da API quando bloqueado (423 vs 200 parcial)
- [ ] Decidir se o digest é pré-calculado ou on-demand
- [ ] Definir o que acontece com novas transações retroativas após digest gerado
- [ ] Avaliar custo de performance da query COUNT com múltiplos tenants
