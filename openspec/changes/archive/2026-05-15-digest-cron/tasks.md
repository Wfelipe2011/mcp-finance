# Tasks — digest-cron

## Group 1: BunPgAdapter — Novos métodos para digest

- [x] **Task 1.1** — Adicionar `getDigestCoverage(year, month)` em `BunPgAdapter`: executa `SET LOCAL app.tenant_id`, LEFT JOIN `f_transacoes` com `ai_transaction_insights`, retorna `{ total: number, enriched: number }`.
- [x] **Task 1.2** — Adicionar `getDigestData(year, month)` em `BunPgAdapter`: busca linha em `ai_monthly_digest` para `tenant_id + year + month`, retorna `null` se não existe.
- [x] **Task 1.3** — Adicionar `upsertDigest(year, month, data)` em `BunPgAdapter`: UPSERT em `ai_monthly_digest` com `ON CONFLICT (tenant_id, year, month) DO UPDATE`.
- [x] **Task 1.4** — Adicionar `getActiveTenantsIds()` em `BunPgAdapter` (sem SET LOCAL — query na tabela `tenants` diretamente): retorna `string[]` dos tenants com `status = 'active'`.

## Group 2: Rota GET /api/digest — Simplificação

- [x] **Task 2.1** — Reescrever `src/application/web/routes/digest.ts`: recebe `tenantId`, cria `BunPgAdapter(tenantId)`, chama `getDigestCoverage()` e `getDigestData()`, retorna `{ status: "pending", coverage }` ou `{ status: "ready", data }`.
- [x] **Task 2.2** — Remover import e uso de AI/LLM da rota digest; o arquivo não deve importar `generateDigest` ou similares.

## Group 3: Cron digest-cron-process

- [x] **Task 3.1** — Criar `src/application/cron/digest-cron.ts`: implementa lógica `setInterval` que calcula o próximo 23:50, itera tenants ativos, verifica cobertura e gera digest.
- [x] **Task 3.2** — Importar e reutilizar `generateDigest` de `enrichAgent.ts` (ou módulo equivalente) dentro do cron para a chamada ao modelo.
- [x] **Task 3.3** — Logar resultados por tenant: `[cron] tenant=<uuid> digest=generated` ou `[cron] tenant=<uuid> coverage=X/Y — skipped`.

## Group 4: Remoção do script CLI digest.ts

- [x] **Task 4.1** — Deletar `src/scripts/digest.ts`.
- [x] **Task 4.2** — Remover script `"digest"` do `package.json` raiz.

## Group 5: Docker / Entrypoint

- [x] **Task 5.1** — Adicionar entrypoint para o cron no `Dockerfile` ou `docker-compose.yml` como serviço separado `digest-cron` rodando `bun run src/application/cron/digest-cron.ts`.

## Group 6: Verificação

- [x] **Task 6.1** — Testar `GET /api/digest?month=YYYY-MM` com tenant sem digest: verificar que retorna `{ status: "pending", coverage }` sem erro.
- [x] **Task 6.2** — Testar `GET /api/digest?month=YYYY-MM` com tenant com digest no banco: verificar que retorna `{ status: "ready", data: {...} }`.
- [x] **Task 6.3** — Verificar que o cron não é invocado por `bun run digest` — script deve estar ausente do `package.json`.
