## Why

Com a infraestrutura do client pronta (`web-client-setup`), precisamos implementar a primeira e mais importante aba: "Como foi o mês?". Essa aba responde à pergunta central do Pierre Finance — o usuário abre o app e imediatamente vê o resultado financeiro do mês, os alertas da IA e o fôlego em meses. É o ponto de entrada emocional do dashboard.

## What Changes

- Implementar `client/src/tabs/Resumo.tsx` substituindo o placeholder
- Criar `client/src/components/DigestNarrative.tsx` — exibe `narrative_pt` com accordion
- Criar `client/src/components/FlagPills.tsx` — exibe `flags` da IA como badges coloridas
- Criar `client/src/components/RunwayIndicator.tsx` — exibe runway em meses com cor semântica
- Usar `Metric`, `Card`, `BarList`, `Badge`, `Callout` do Tremor

## Capabilities

### New Capabilities

- `web-tab-resumo-ui`: aba Resumo completa com cashflow do mês, flags IA, narrativa colapsável e indicador de runway

### Modified Capabilities

## Impact

- **Arquivo modificado**: `client/src/tabs/Resumo.tsx` (placeholder → implementação real)
- **Arquivos novos**: 3 componentes em `client/src/components/`
- **Endpoints consumidos**: `GET /api/cashflow?month=`, `GET /api/digest?month=`, `GET /api/runway`
- **Zero impacto** no server ou em outras abas
