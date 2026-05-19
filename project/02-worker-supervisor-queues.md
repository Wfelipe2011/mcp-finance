# Contexto 02 — Worker Supervisor + Filas Prioritizadas

## Objetivo desta rodada de explore

Consolidar os workers separados (enrich, digest, forecast, daily-insight) em um único worker supervisor com:
- **Prioridades de fila**: mensagens diárias `0` > enrich `1` > digest `2`
- Forecast como tarefa de manutenção (baixa prioridade, roda por cron)
- Um único container Docker para o device único
- Lógica de orquestração no próprio supervisor

---

## Situação atual

### Workers existentes

```
src/application/workers/
  shared-worker.ts       ← já é o worker "unificado", usa round-robin
  enrich-worker.ts       ← worker legado (ainda usado?)
  digest-worker.ts       ← worker legado (ainda usado?)
  forecast-worker.ts     ← worker legado (ainda usado?)
  daily-insight-worker.ts ← novo, para insights diários LLM

src/application/cron/
  digest-cron.ts         ← enfileira digest_jobs
  forecast-cron.ts       ← enfileira forecast_jobs
  daily-insight-cron.ts  ← enfileira daily_insight_jobs
```

### Filas existentes (inferido do BunPgAdapter)
```
enrich_jobs        ← prioridade 1 (enriquecimento de transação)
digest_jobs        ← prioridade 2 (análise mensal LLM)
forecast_jobs      ← prioridade 3 (mensagem de previsão LLM)
daily_insight_jobs ← prioridade 0? (insight diário — mais urgente)
ml_training_jobs   ← separado (Python, não TypeScript)
```

### Problema: round-robin não é prioridade

O `shared-worker.ts` atual usa round-robin (`QUEUE_ORDER: ["enrich", "digest", "forecast"]`).
Isso significa que se há 100 jobs de enrich e 1 de digest, o worker alterna entre eles igualmente.

**Usuário espera:** ver o insight do dia imediatamente quando abre o app.
**Realidade:** o insight diário pode ficar preso atrás de 50 enrich jobs.

---

## Proposta a explorar

### Hierarquia de prioridades

```
Prioridade 0 (CRÍTICA) — daily_insight_jobs
  "Qual é o meu insight do dia hoje?"
  → Usuário abre o app de manhã e espera ver isso imediatamente
  → Gerado 1x por dia por tenant via cron 00:35

Prioridade 1 (ALTA) — enrich_jobs
  "Categorização e enriquecimento de transação nova"
  → Impacta qualidade de todos os outros dados
  → Volume alto: 1 job por transação nova

Prioridade 2 (NORMAL) — digest_jobs
  "Análise mensal da IA"
  → Gerado 1x por mês por tenant
  → Usuário espera alguns minutos, tudo bem

Prioridade 3 (BAIXA) — forecast_jobs
  "Mensagem de previsão de cashflow"
  → Complemento ao ML/VIEW forecast
  → Usuário não espera isso em tempo real
```

### Algoritmo supervisor proposto

```
loop():
  1. Tentar priority 0 (daily_insight) → processa se encontrar
  2. Se não encontrou: tentar priority 1 (enrich)
  3. Se não encontrou: tentar priority 2 (digest)
  4. Se não encontrou: tentar priority 3 (forecast)
  5. Se nenhum: dormir N segundos
  6. Voltar para 1
```

Variação: processamento weighted (ex: a cada 10 loops, 7 vão para enrich, 2 para digest, 1 para forecast), mas prioridade 0 sempre sai primeiro.

---

## Questões para o explore

1. **Workers legados** (`enrich-worker.ts`, `digest-worker.ts`, `forecast-worker.ts`): ainda são usados em algum serviço Docker ou já podem ser removidos em favor do `shared-worker.ts`?
2. **`daily-insight-worker.ts`**: deve ser integrado ao `shared-worker` ou manter separado? O worker diário tem lógica de "apenas 1 por tenant por dia" que pode complicar a integração.
3. **Crons**: continuam existindo (são os produtores de jobs), mas talvez consolidar em um único `supervisor-cron.ts`?
4. **Backpressure**: se enrich_jobs tem 500 jobs na fila, o supervisor deve processar todos antes de checar digest? Ou checar digest a cada N enrich?
5. **Forecast ML (Python)**: o `ml_training_jobs` é completamente separado (roda em container Python). Não entra nesta consolidação. Confirmar.

---

## Arquivos-chave para a change

| Arquivo | Papel |
|---|---|
| `src/application/workers/shared-worker.ts` | Ponto de partida — adicionar lógica de prioridade |
| `src/application/workers/daily-insight-worker.ts` | Mergear lógica aqui |
| `src/application/workers/enrich-worker.ts` | Possível remoção (legacy) |
| `src/application/workers/digest-worker.ts` | Possível remoção (legacy) |
| `src/application/workers/forecast-worker.ts` | Possível remoção (legacy) |
| `src/application/cron/digest-cron.ts` | Produtor de digest_jobs (manter) |
| `src/application/cron/forecast-cron.ts` | Produtor de forecast_jobs (manter) |
| `src/application/cron/daily-insight-cron.ts` | Produtor de daily_insight_jobs (manter) |
| `docker-compose.yml` | Remover serviços de workers separados |
| `src/infrastructure/db/BunPgAdapter.ts` | Métodos das filas (nextJob, markDone, etc.) |

---

## Referências internas

- Implementação atual do round-robin: `src/application/workers/shared-worker.ts` (linhas 1-60)
- Tabelas de fila: `enrich_jobs`, `digest_jobs`, `forecast_jobs`, `daily_insight_jobs`
- Padrão `nextJob(workerId)` + `markDone(jobId)` já existe em `BunPgAdapter`

---

## O que NÃO muda

- **ML Python** (`src/ml/trainer.py`, `src/ml/daily_trainer.py`) → separado, container próprio
- **Crons como produtores** → continuam existindo e enfileirando
- **Estrutura das tabelas de fila** → sem migração de schema
- **Lógica de negócio dos handlers** (enrich, digest, forecast) → apenas reorganizar onde rodam

---

## Sugestão de escopo para a change

**Uma change focada:**
1. Refatorar `shared-worker.ts` para usar prioridade (0→1→2→3) em vez de round-robin
2. Integrar lógica de `daily-insight-worker.ts` como handler de priority 0
3. Atualizar `docker-compose.yml` para ter apenas `shared-worker` (remover outros)
4. Marcar workers legados como deprecated (ou deletar se não forem usados)

**Considerar junto:**
- Se `daily_insight_jobs` tem coluna `priority` no banco ou se a prioridade é apenas por qual fila consultar primeiro
