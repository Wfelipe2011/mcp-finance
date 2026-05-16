## MODIFIED Requirements

### Requirement: Margem esquerda responsiva no CashflowAreaChart
O `CashflowAreaChart` SHALL exibir labels do eixo Y sem truncamento em viewports ≤600px.

#### Scenario: Margem menor em mobile
- **WHEN** a largura do viewport é ≤600px
- **THEN** `margin.left` é 48px (vs 60px em desktop)
- **AND** as labels "R$69.5k" são totalmente visíveis no espaço disponível

#### Scenario: Sem regressão em desktop
- **WHEN** a largura do viewport é >600px
- **THEN** `margin.left` permanece 60px e o comportamento é idêntico ao atual
