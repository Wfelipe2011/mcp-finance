## Why

As duas últimas abas completam o dashboard: "Como estão meus investimentos?" mostra patrimônio por tipo e evolução mensal; "O que a IA viu?" é o ponto de encontro entre dados e inteligência artificial — narrativa do digest, despesas notáveis e transações com anomalia. Essas abas finalizam a experiência completa Pierre Finance no nosso dashboard.

## What Changes

- Implementar `client/src/tabs/Investimentos.tsx` substituindo o placeholder
- Implementar `client/src/tabs/Insights.tsx` substituindo o placeholder
- Criar `client/src/components/PatrimonioDonut.tsx` — donut de patrimônio por tipo de ativo
- Criar `client/src/components/InvestimentosBarChart.tsx` — barras de rendimento mensal dos últimos 6 meses
- Criar `client/src/components/NotableExpenses.tsx` — lista de despesas notáveis do digest
- Criar `client/src/components/AnomaliasList.tsx` — transações com `anomaly_score` acima de threshold

## Capabilities

### New Capabilities

- `web-tab-investimentos-ui`: aba Investimentos com patrimônio total, donut por tipo e evolução mensal
- `web-tab-insights-ui`: aba Insights com narrativa completa, despesas notáveis e transações com anomalia

### Modified Capabilities

## Impact

- **Arquivos modificados**: `client/src/tabs/Investimentos.tsx` e `client/src/tabs/Insights.tsx`
- **Arquivos novos**: 4 componentes em `client/src/components/`
- **Endpoints consumidos**: `GET /api/patrimonio`, `GET /api/investimentos?months=6`, `GET /api/digest?month=`, `GET /api/transacoes?month=` (filtrado por anomaly_score)
- **Zero impacto** no server ou em outras abas
