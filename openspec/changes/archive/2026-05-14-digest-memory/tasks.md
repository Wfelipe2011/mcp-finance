# Tasks: digest-memory

## 1. BunPgAdapter — método de histórico

- [x] **Task 1**: Adicionar tipo `PreviousDigestRow` ao `BunPgAdapter.ts` com campos: `year`, `month`, `cashflow_real`, `debt_inflows`, `debt_payments`, `narrative_pt`, `flags`
- [x] **Task 2**: Implementar `db.aiDigests.getPreviousDigests(year, month, limit)` — SELECT em `ai_monthly_digest` WHERE `(year, month) < (target_year, target_month)` ORDER BY `year DESC, month DESC` LIMIT `limit`

## 2. digest.ts — buscar histórico

- [x] **Task 3**: Após `parseMonth()`, chamar `db.aiDigests.getPreviousDigests(year, month, 3)` para buscar os 3 meses anteriores
- [x] **Task 4**: Passar o array `previousDigests` para `generateDigest()`

## 3. digestAgent.ts — usar histórico no prompt

- [x] **Task 5**: Adicionar campo `previousDigests: PreviousDigestRow[]` ao tipo `DigestInput`
- [x] **Task 6**: Construir seção `HISTÓRICO RECENTE` no `HumanMessage` do Agent 1 com tabela de métricas dos meses anteriores (cashflow_real, flags, narrative resumido em 1 linha)
- [x] **Task 7**: Omitir a seção de histórico quando `previousDigests` for vazio (primeiro mês rodado)

## 4. Validação

- [x] **Task 8**: Rodar `bun run enrich` e `bun run digest --month 2025-06` e verificar que a `narrative_pt` menciona comparação com mês anterior
