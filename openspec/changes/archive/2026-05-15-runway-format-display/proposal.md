## Why

O componente `RunwayIndicator` exibe o fôlego financeiro em "X.X meses de fôlego", mas meses com decimais são difíceis de interpretar: "0.0 meses" não diz nada, e "2.3 meses" é pouco intuitivo. O humano pensa em tempo como dias ou meses inteiros. A mudança melhora a legibilidade sem alterar a fonte de dados.

## What Changes

- Remover o label "X.X meses de fôlego" do `RunwayIndicator`
- Substituir por formato contextual:
  - Se `runway < 30 dias`: exibir **"X dias"** (ex: "23 dias")
  - Se `runway >= 30 dias`: exibir **"X meses e X dias"** (ex: "2 meses e 14 dias")
- A conversão é feita no frontend: `runway_meses * 30.44` → dias totais, depois decompõe em meses inteiros + dias restantes
- O chip de cor semântica continua (error/warning/success), mas o threshold usa dias:
  - `>= 90 dias` → success
  - `>= 30 dias` → warning
  - `< 30 dias` → error

## Capabilities

### New Capabilities

- `runway-format-display`: Lógica de formatação do fôlego financeiro em dias e meses legíveis

### Modified Capabilities

*(nenhuma — as mudanças são exclusivamente de apresentação no componente)*

## Impact

- `client/src/components/RunwayIndicator.tsx` — formatação e thresholds de cor atualizados
- Nenhuma mudança no backend, SQL ou API
