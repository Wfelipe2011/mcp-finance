## MODIFIED Requirements

### Requirement: KPI de total gasto com semântica negativa
O sistema SHALL exibir o total de gastos do mês na aba Gastos com tipografia `number-display` e tom semântico negativo (`--color-trading-down`), sinalizando que representa saída de dinheiro.

#### Scenario: Total gasto exibido em destaque semântico
- **WHEN** o usuário acessa a aba Gastos
- **THEN** o total gasto é o elemento mais proeminente da tela, com tipografia `number-display` e cor `--color-trading-down`

### Requirement: Sinalização semântica de tendências de gastos
O sistema SHALL exibir setas ou ícones direcionais com cor semântica nos componentes `TendenciasGrupos` e `TendenciasRecorrentes`: tendência de alta usa `--color-trading-down` (gasto aumentando é negativo), tendência de baixa usa `--color-trading-up` (gasto reduzindo é positivo).

#### Scenario: Tendência de alta sinalizada corretamente
- **GIVEN** que um grupo de gastos aumentou em relação ao período anterior
- **WHEN** o componente TendenciasGrupos é renderizado
- **THEN** o ícone/seta é exibido com `--color-trading-down`

#### Scenario: Tendência de baixa sinalizada corretamente
- **GIVEN** que um grupo de gastos diminuiu em relação ao período anterior
- **WHEN** o componente TendenciasGrupos é renderizado
- **THEN** o ícone/seta é exibido com `--color-trading-up`

### Requirement: Componentes de categoria e novos gastos tokenizados
O sistema SHALL renderizar `CategoriaBarList`, `NovosGastos`, `TendenciasGrupos` e `TendenciasRecorrentes` usando exclusivamente tokens CSS do design system.

#### Scenario: Nenhuma cor hardcoded nos componentes da aba Gastos
- **WHEN** os arquivos dos componentes da aba Gastos são inspecionados
- **THEN** não existe nenhum valor hex de cor direto fora das variáveis CSS
