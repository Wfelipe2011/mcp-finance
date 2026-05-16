## Why

O KPI "Fôlego Financeiro" atualmente considera apenas o saldo em conta corrente e poupança (`CHECKING_ACCOUNT` / `SAVINGS_ACCOUNT`). Isso produz um valor artificialmente baixo (ex: 0.0 meses) porque o comportamento real é manter o mínimo na conta corrente e guardar a reserva em investimentos. O próprio documento de referência define o fôlego como cruzamento das saídas com "saldos líquidos em aplicações (Investments)", contradizendo a implementação atual.

## What Changes

- Substituir `kpi_cash_runway` (view única) por duas views complementares:
  - **`kpi_runway_imediato`**: saldo em conta corrente + poupança ÷ média de despesas (90d) — indica quantos dias/meses sem tocar em nada
  - **`kpi_runway_total`**: saldo em conta corrente + poupança + **todos os investimentos** ÷ média de despesas (90d) — reflete a sobrevida real em caso de emergência
- Adicionar coluna `saldo_investimentos` em `cube_patrimonio` (ou criar view auxiliar `cube_patrimonio_investimentos`) para expor o saldo atual dos investimentos
- Atualizar o endpoint `/api/runway` para retornar ambas as métricas
- Atualizar o frontend (`RunwayIndicator`) para exibir as duas métricas lado a lado

## Capabilities

### New Capabilities

- `runway-dual-metric`: Duas métricas de fôlego financeiro — imediato (só conta corrente) e total (conta + investimentos) — expostas via SQL views, API endpoint e componente frontend

### Modified Capabilities

- `gold-cube-patrimonio`: O cubo de patrimônio precisa incluir o saldo consolidado de investimentos (`investments.balance`) para alimentar `kpi_runway_total`

## Impact

- `src/infrastructure/db/gold-cubes.sql` — substituição de `kpi_cash_runway` por duas views
- `src/infrastructure/db/BunPgAdapter.ts` — query do `getRunway()` atualizada para retornar dois campos
- `src/application/web/routes/runway.ts` (ou equivalente) — resposta da API com `runway_imediato_meses` e `runway_total_meses`
- `client/src/components/RunwayIndicator.tsx` — UI atualizada para mostrar as duas métricas
- `client/src/api/types.ts` — tipo `Runway` atualizado com novos campos
