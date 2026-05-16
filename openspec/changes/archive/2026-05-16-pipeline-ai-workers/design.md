## Context

O sistema tem hoje 4 processos AI rodando de forma independente:
- `enrich-worker.ts`: consome `enrich_jobs` via supervisor, spawna N workers por row na tabela `workers`
- `digest-cron.ts`: roda às 23:50, gera digest direto via AI para tenants com 100% de coverage
- `forecast-cron.ts`: roda às 00:30 UTC, gera mensagem diária de forecast direto via AI
- `ml/trainer.py`: roda às 00:00 BRT via `schedule`, treina RandomForest por tenant

Os três últimos não têm visibilidade no admin, não têm fila persistente e não podem ser acionados manualmente. O supervisor só conhece o enrich.

## Goals / Non-Goals

**Goals:**
- Unificar digest e forecast na arquitetura de workers existente (tabela `workers` com `kind`, supervisor spawna por tipo)
- Converter crons de digest e forecast em auto-enqueue (inserem em fila, não processam)
- Criar fila `ml_training_jobs` para o trainer Python consumir (mantendo isolamento do Docker service)
- Expor controle manual no admin panel: botões de enqueue e cards de queue stats para os 3 novos tipos
- Manter restrição de coverage 100% no enqueue do digest

**Non-Goals:**
- Paralelismo de workers para digest/forecast (1 worker por kind é suficiente)
- Remover o `ml-trainer` como Docker service isolado
- Alterar o modelo AI ou algoritmo ML de qualquer pipeline
- UI client-side (Vite) — apenas o admin panel HTML

## Decisions

### D1: `kind` na tabela `workers`, supervisor spawna script por tipo

**Escolha:** Adicionar coluna `kind TEXT NOT NULL DEFAULT 'enrich'` à tabela `workers`. O supervisor lê `kind` e escolhe o script a spawnar:
- `'enrich'` → `src/application/workers/enrich-worker.ts`
- `'digest'` → `src/application/workers/digest-worker.ts`
- `'forecast'` → `src/application/workers/forecast-worker.ts`

**Alternativa descartada:** Processos hardcoded separados (um supervisor para cada tipo). Mais difícil de administrar, duplica a lógica de reconcile.

**Rationale:** O supervisor já tem a lógica de reconcile, spawn, error_count e kill. Reusar é trivial com `kind`. O admin já tem CRUD de workers — ganha controle de digest/forecast de graça.

---

### D2: ML trainer mantém isolamento Docker, consome fila via polling

**Escolha:** O `ml/trainer.py` não entra no supervisor TypeScript. Em vez do `schedule`, o trainer faz polling em `ml_training_jobs` com intervalo de 60s. O enqueue acontece via admin ou pelo cron automático (00:00 BRT).

**Alternativa descartada:** Supervisor TypeScript spawnar `python3 trainer.py`. Violaria o isolamento do `ml-trainer` Docker service e exporia `ML_DATABASE_URL` ao supervisor.

**Rationale:** O trainer já tem Docker service próprio com `ML_DATABASE_URL` superuser. A única mudança é no loop de execução — de scheduler direto para fila.

---

### D3: Crons viram auto-enqueue, workers fazem o trabalho

**Escolha:** 
- `digest-cron.ts`: ainda roda às 23:50, mas faz `INSERT INTO digest_jobs` para tenants com coverage 100% (não gera digest diretamente)
- `forecast-cron.ts`: ainda roda às 00:30 UTC, mas faz `INSERT INTO forecast_jobs` (não gera mensagem diretamente)
- `ml/trainer.py`: às 00:00 BRT, faz `INSERT INTO ml_training_jobs` (não treina diretamente)

Os workers (`digest-worker.ts`, `forecast-worker.ts`, loop Python) consomem as filas.

**Rationale:** Desacopla agendamento de execução. Admin pode enfileirar a qualquer momento sem duplicar lógica. Idempotência garantida por constraints UNIQUE nas jobs tables.

---

### D4: Verificação de coverage no digest em dois lugares

**Escolha:** Enqueue (admin e cron) filtra tenants com coverage 100% — não insere jobs para quem está incompleto. O `digest-worker.ts` verifica novamente antes de processar (safety net) e marca como `skipped` se a coverage caiu desde o enqueue.

**Rationale:** Evita jobs "mortos" na fila enquanto mantém resiliência contra mudanças de estado entre enqueue e execução.

---

### D5: Estrutura das jobs tables espelha `enrich_jobs` com granularidade própria

```sql
digest_jobs:      (tenant_id, year, month)  -- UNIQUE
forecast_jobs:    (tenant_id, job_date)     -- UNIQUE  
ml_training_jobs: (tenant_id, triggered_at) -- sem UNIQUE (pode re-treinar)
```

`digest_jobs` e `forecast_jobs` têm constraint UNIQUE para idempotência de enqueue. `ml_training_jobs` permite múltiplos enqueues (re-treino manual faz sentido).

## Risks / Trade-offs

- **[Risk] digest-worker com 1 instância pode atrasar se muitos tenants** → Mitigação: digest por tenant é rápido (1 chamada AI), em produção são poucos tenants
- **[Risk] ml_training_jobs sem UNIQUE pode acumular jobs duplicados** → Mitigação: admin UI avisa quantidade pendente; cron só enfileira 1x por dia
- **[Risk] supervisor reconcile de 10min pode atrasar spawn de digest/forecast workers** → Mitigação: o supervisor faz reconcile inicial no startup; workers ficam rodando permanentemente (não morrem quando fila está vazia, só dormem)
- **[Risk] Python loop polling a cada 60s pode perder jobs se ml-trainer crashar** → Mitigação: `ml_training_jobs.status` persiste; ao reiniciar, releaseStuck() recupera jobs `running` há mais de 10min

## Migration Plan

1. Adicionar `kind` à tabela `workers` com `DEFAULT 'enrich'` — não quebra workers existentes
2. Criar tabelas `digest_jobs`, `forecast_jobs`, `ml_training_jobs` — aditivo
3. Deploy do supervisor atualizado (lê `kind`) — retrocompatível
4. Criar workers `digest-worker.ts` e `forecast-worker.ts`
5. Criar workers `kind='digest'` e `kind='forecast'` via admin panel
6. Atualizar crons para auto-enqueue
7. Atualizar `ml/trainer.py` para loop de fila
8. Adicionar cards no admin panel

**Rollback:** Remover workers `kind='digest'/'forecast'` do DB desativa o spawn sem código. Revert dos crons restaura comportamento original.

## Open Questions

- _(resolvido)_ ML fica no supervisor ou isolado? → Isolado, via fila
- _(resolvido)_ Crons processam ou apenas enfileiram? → Apenas enfileiram
- _(resolvido)_ Digest tem restrição de coverage no enqueue? → Sim, e também no worker como safety net
