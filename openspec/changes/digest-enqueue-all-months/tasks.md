## 1. Query de meses elegíveis no BunPgAdapter

- [ ] 1.1 Adicionar método `getEligibleMonthsForDigest(tenantId: string): Promise<{year: number, month: number}[]>` no `BunPgAdapter` que retorna os pares `(year, month)` com cobertura ≥ 80% sem job `done`/`pending`/`running` existente

## 2. Atualizar handler de enqueue

- [ ] 2.1 Atualizar `handleDigestEnqueue` em `src/application/web/routes/admin/pipeline-queues.ts` para:
  - Ler `month?: string` do body JSON (formato `"YYYY-MM"`)
  - Se `month` fornecido: usar apenas esse par `(year, month)` para todos os tenants
  - Se `month` omitido: chamar `getEligibleMonthsForDigest` por tenant para obter todos os meses elegíveis
  - Enfileirar todos os pares coletados via `rootDb.digest_jobs.enqueue`
  - Retornar `{ enqueued, eligible, coverage_min, months }` onde `months` é array de strings `"YYYY-MM"`

## 3. Validação

- [ ] 3.1 Rodar `bun run build` na raiz (se aplicável) ou verificar erros de TypeScript com `cd client && bun run build`
- [ ] 3.2 Testar via curl: chamar o endpoint sem body e confirmar que meses históricos de Wilson são enfileirados
- [ ] 3.3 Chamar novamente e confirmar que `enqueued: 0` (idempotência)
