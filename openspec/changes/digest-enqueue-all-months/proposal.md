## Why

O endpoint `POST /api/admin/digest/enqueue` só enfileira o **mês atual** (data do servidor), ignorando todos os meses históricos — mesmo que tenham cobertura ≥ 80% e nunca tenham sido processados. Ao clicar "rodar", o usuário espera que todos os meses elegíveis sejam enfileirados, não apenas o corrente.

## What Changes

- `handleDigestEnqueue` passa a varrer todos os meses com transações disponíveis por tenant, não apenas o mês atual
- Para cada tenant, a query retorna todos os `(year, month)` distintos com cobertura ≥ 80% que **não possuem** um digest job `done` ou `pending`/`running` já existente
- O body da requisição pode receber `month?: string` (YYYY-MM) para forçar um mês específico — se omitido, varre todos os meses elegíveis
- A resposta passa a incluir `months_enqueued: number[]` listando os meses enfileirados

## Capabilities

### New Capabilities

- `digest-enqueue-all-months`: Lógica do endpoint admin de enqueue que varre todos os meses históricos elegíveis por tenant em vez de apenas o mês atual

### Modified Capabilities

<!-- nenhum spec existente afetado no nível de requisito -->

## Impact

- `src/application/web/routes/admin/pipeline-queues.ts` — `handleDigestEnqueue`
- Novo método no `BunPgAdapter` ou query inline: `getEligibleMonthsForDigest(tenantId)` — retorna `{year, month}[]` com cobertura ≥ 80% sem job done/pending/running
- Schema do banco: sem alterações (usa `digest_jobs` existente + UNIQUE constraint já garante idempotência)
