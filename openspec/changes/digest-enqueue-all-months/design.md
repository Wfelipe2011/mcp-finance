## Context

O endpoint `POST /api/admin/digest/enqueue` usa `new Date()` para derivar o par `(year, month)` e só enfileira o mês corrente. Isso foi suficiente quando a feature foi criada — o cron rodaria diariamente e cobraria o mês em curso. Porém, meses históricos com cobertura ≥ 80% nunca são enfileirados automaticamente, e não existe mecanismo para fazê-lo via API.

O `digest_jobs` tem UNIQUE constraint em `(tenant_id, year, month)`, o que garante idempotência — inserir o mesmo par duas vezes falha silenciosamente.

## Goals / Non-Goals

**Goals:**
- O endpoint varrer todos os `(year, month)` disponíveis por tenant e enfileirar os elegíveis que ainda não possuem job ativo ou concluído
- Permitir forçar um mês específico via body (`month: "YYYY-MM"`) para reprocessamento pontual
- Manter a idempotência: chamar o endpoint N vezes não cria jobs duplicados

**Non-Goals:**
- Alterar a lógica do worker ou do schema do banco
- Polling automático de meses no frontend
- Expor o endpoint a usuários não-admin

## Decisions

### D1 — Query de meses elegíveis no banco

**Decisão**: Adicionar uma query SQL inline no handler (ou método no `BunPgAdapter`) que retorna todos os `(year, month)` distintos com cobertura ≥ 80% e sem job em status `done`, `pending`, ou `running`.

```sql
SELECT year, month
FROM (
  SELECT
    EXTRACT(YEAR  FROM date_day)::int AS year,
    EXTRACT(MONTH FROM date_day)::int AS month,
    COUNT(*) FILTER (WHERE enrichment_kind IS NOT NULL) AS enriched,
    COUNT(*) AS total
  FROM transactions   -- via RLS do tenant
  GROUP BY 1, 2
) coverage
WHERE total > 0
  AND enriched::float / total >= 0.8
  AND NOT EXISTS (
    SELECT 1 FROM digest_jobs dj
    WHERE dj.tenant_id = $tenantId
      AND dj.year  = coverage.year
      AND dj.month = coverage.month
      AND dj.status IN ('done','pending','running')
  )
```

**Alternativa considerada**: Calcular cobertura em memória iterando mês a mês — descartado por ser ineficiente e exigir múltiplas queries.

**Rationale**: Uma query por tenant é suficiente. O volume de meses históricos é pequeno (< 24).

### D2 — Parâmetro `month` opcional no body

**Decisão**: Se `month` (string `"YYYY-MM"`) for fornecido no body, o handler ignora a varredura e enfileira apenas aquele mês específico para todos os tenants elegíveis.

**Rationale**: Permite reprocessamento pontual sem alterar a lógica de varredura.

### D3 — Sem alteração no schema do banco

**Decisão**: Reutilizar `digest_jobs` existente com o ON CONFLICT DO NOTHING já presente.

## Risks / Trade-offs

- **[Risco]** Muitos meses históricos elegíveis → muitos jobs inseridos de uma vez → sobrecarga no worker → **Mitigação**: comportamento existente; o worker já processa um job por vez com retry
- **[Trade-off]** Query de cobertura roda para cada tenant separadamente → N queries → aceitável dado o volume pequeno de tenants

## Migration Plan

Mudança puramente no handler. Sem migração de dados.

1. Adicionar método `getEligibleMonthsForDigest(tenantId)` no `BunPgAdapter` (ou query inline no handler)
2. Atualizar `handleDigestEnqueue` para varrer todos os meses por tenant
3. Testar com Wilson: chamar o endpoint e confirmar que meses históricos são enfileirados
