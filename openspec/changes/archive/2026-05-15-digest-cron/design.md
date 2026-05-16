## Context

O digest atual (`routes/digest.ts`) chama `db.getDigestMensal(year, month)` que provavelmente retorna dados pré-computados ou chama AI on-demand. O script `src/scripts/digest.ts` usa `db.aiDigests.getMonthInsights()` + `generateDigest()` para gerar o digest com AI. O processo cron precisa iterar por todos os tenants ativos — sem RLS ativo (acessa `tenants` diretamente).

## Goals / Non-Goals

**Goals:**
- Cron diário às 23:50 verifica e gera digest para tenants com 100% de enrich no mês corrente
- `GET /api/digest` é leitura rápida sem AI
- Tenant sem digest vê `{ status: "pending" }` — UI pode mostrar "processando"

**Non-Goals:**
- Digest on-demand via API (removido)
- Retry em caso de falha de AI no cron (tenta novamente no dia seguinte)
- Múltiplos meses retroativos (o cron processa apenas o mês corrente)

## Decisions

### D1: Cron usa `setInterval` calculando próximo horário às 23:50

```typescript
function scheduleNext() {
  const now = new Date();
  const next = new Date();
  next.setHours(23, 50, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(async () => {
    await runDigestCron();
    scheduleNext();
  }, delay);
}
```

**Rationale**: Sem dependência de `node-cron` ou similar. Bun puro. Processo leve.

### D2: Gate de enrich via query de contagem

```sql
SELECT
  COUNT(*) AS total,
  COUNT(ai.transaction_id) AS enriched
FROM f_transacoes t
LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
WHERE t.ano = $year AND t.mes = $month
```

Se `enriched = total AND total > 0` → gera digest. O cron roda isso para cada tenant ativo, com `SET LOCAL app.tenant_id` para cada um.

### D3: GET /api/digest retorna status + dados ou status pending

```typescript
// ANTES:
{ ...digest_data }  // ou 404 se não existir

// DEPOIS:
{ status: "pending", coverage: 0.75 }           // enrich incompleto
{ status: "ready", data: { ...digest_data } }    // digest gerado
```

**Rationale**: O cliente pode mostrar progresso (`coverage: 75%`) mesmo sem digest pronto. Sem HTTP 423 — `status` em JSON é mais amigável para o frontend.

## Risks / Trade-offs

- **Cron falha silenciosamente** → se a AI falha às 23:50, o digest não é gerado; tenta amanhã. Mitigation: logar claramente o erro; aceitável no MVP.
- **Mês incompleto com 100% de enrich** → se o sync de dezembro ainda não rodou mas os jobs existentes estão todos enriched, o cron gera digest com dados parciais. Mitigation: `total > 0` no gate previne digest de mês sem transações; meses com poucos dados são edge case.
- **Cron como SPOF** → se o cron morrer, nenhum digest é gerado. Mitigation: `restart: always` no Docker Compose.

## Migration Plan

1. Implementar `getDigestStatus()` no `BunPgAdapter`
2. Simplificar `routes/digest.ts`
3. Criar `src/application/cron/digest-cron.ts`
4. Remover `src/scripts/digest.ts`
5. Adicionar ao `docker-compose.yml`

## Open Questions

- *(Resolvido)* Digest on-demand removido — só via cron ✓
- *(Resolvido)* Gate via contagem de cobertura ✓
- *(Resolvido)* Status field em JSON em vez de HTTP 423 ✓
