## MODIFIED Requirements

### Requirement: Donut charts legíveis em mobile (390px)
Os componentes `GruposDonut` e `PatrimonioDonut` SHALL ser legíveis em viewports a partir de 390px de largura, sem truncamento ou overflow do gráfico.

#### Scenario: Donut sem legenda lateral
- **WHEN** o componente é renderizado em qualquer largura
- **THEN** a legenda NÃO fica posicionada à direita do gráfico (sem `slotProps.legend` lateral)
- **AND** o PieChart usa `margin` simétrico (≤20px em cada lado)

#### Scenario: Legenda separada abaixo do donut
- **WHEN** o componente é renderizado
- **THEN** abaixo do PieChart existe uma legenda com bolinha colorida + rótulo para cada fatia
- **AND** os itens fazem wrap quando há muitos grupos

#### Scenario: Gráficos de barra/área sem truncamento em mobile
- **WHEN** os componentes `CashflowAreaChart`, `CategoriaBarList` ou `InvestimentosBarChart` são renderizados em viewport ≤600px
- **THEN** as labels do eixo Y são visíveis sem truncamento
- **AND** a margem esquerda é reduzida em mobile (usando `useMediaQuery`)
