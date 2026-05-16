## ADDED Requirements

### Requirement: PieChart donut substitui DonutChart Tremor
O sistema SHALL usar `PieChart` do `@mui/x-charts` com `innerRadius` > 0 para renderizar donuts nos componentes `GruposDonut` e `PatrimonioDonut`. Os charts SHALL exibir tooltip nativo MUI ao hover e legenda abaixo do chart.

#### Scenario: Donut renderiza fatias proporcionais
- **WHEN** dados de grupos de gastos são passados ao `GruposDonut`
- **THEN** o PieChart exibe até 5 grupos + "Outros" como fatias proporcionais com labels de valor em BRL via `valueFormatter`

#### Scenario: Fatias de patrimônio excluem contas CREDIT
- **WHEN** `PatrimonioDonut` recebe contas com `tipo === "CREDIT"`
- **THEN** essas contas são excluídas do chart e apenas saldos positivos são exibidos

### Requirement: LineChart com área substitui AreaChart Tremor
O sistema SHALL usar `LineChart` do `@mui/x-charts` com `area` habilitado para renderizar o cashflow projetado em `CashflowAreaChart`. Séries "Cashflow Real" e "Projetado" SHALL ter cores distintas e conectar pontos nulos (`connectNulls`).

#### Scenario: Duas séries no mesmo chart
- **WHEN** dados de `CashflowProjetado[]` são passados
- **THEN** o LineChart exibe duas séries com cores diferentes, pontos históricos em uma e projetados na outra

#### Scenario: Formatação de valores no eixo Y
- **WHEN** o eixo Y é renderizado
- **THEN** os valores são formatados em BRL (R$ abreviado) legível

### Requirement: BarChart vertical substitui BarChart Tremor em investimentos
O sistema SHALL usar `BarChart` do `@mui/x-charts` com agrupamento de séries para renderizar `InvestimentosBarChart`, mostrando Aplicações e Resgates por mês.

#### Scenario: Barras agrupadas por mês
- **WHEN** dados de investimentos dos últimos 6 meses são passados
- **THEN** o BarChart exibe dois grupos de barras por mês (Aplicações em azul, Resgates em âmbar)

### Requirement: BarChart horizontal substitui BarList Tremor em categorias
O sistema SHALL usar `BarChart` do `@mui/x-charts` com `layout="horizontal"` para renderizar `CategoriaBarList`, mostrando top 10 categorias por valor.

#### Scenario: Categorias ordenadas por valor
- **WHEN** dados de categorias de gastos são passados
- **THEN** o BarChart exibe até 10 categorias em ordem decrescente de valor, com labels legíveis no eixo Y
