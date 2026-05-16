## 1. SQL Views

- [x] 1.1 Em `gold-cubes.sql`, renomear `kpi_cash_runway` para `kpi_runway_imediato` (manter mesma lógica: saldo de `CHECKING_ACCOUNT`/`SAVINGS_ACCOUNT` ÷ média 90d)
- [x] 1.2 Criar view `kpi_runway_total` que soma `saldo_liquido` (de contas) + `COALESCE(SUM(investments.balance), 0)` e divide pela mesma `media_saidas_90d`
- [x] 1.3 Criar alias `CREATE OR REPLACE VIEW kpi_cash_runway AS SELECT * FROM kpi_runway_imediato` para manter compatibilidade

## 2. Backend — BunPgAdapter

- [x] 2.1 Atualizar `getRunway()` em `BunPgAdapter.ts` para consultar as duas views e retornar `{ saldo_liquido, saldo_investimentos, media_saidas_90d, runway_imediato_meses, runway_total_meses }`

## 3. API Endpoint

- [x] 3.1 Atualizar a rota `GET /api/runway` para retornar os novos campos (sem renomear o endpoint)

## 4. Tipos Frontend

- [x] 4.1 Atualizar `interface Runway` em `client/src/api/types.ts`: adicionar `runway_imediato_meses: number | null`, `runway_total_meses: number | null`, `saldo_investimentos: number`; remover `runway_meses`
- [x] 4.2 Atualizar `client/src/api/client.ts` se necessário (método `fetchRunway` não muda, mas retorno muda com os novos campos)

## 5. Componente RunwayIndicator

- [x] 5.1 Atualizar `RunwayIndicator.tsx` para receber e exibir dois chips: "Fôlego imediato: Xd" e "Fôlego total: Xm Xd" (formato de dias/meses será definido por `runway-format-display`)
- [x] 5.2 Calcular `runwayColor()` independentemente para cada métrica

## 6. Usos do campo removido `runway_meses`

- [x] 6.1 Verificar e atualizar todas as referências a `runway.runway_meses` no frontend (`Resumo.tsx`, `ProximoMes.tsx`, etc.) para usar `runway.runway_imediato_meses` ou `runway.runway_total_meses`
