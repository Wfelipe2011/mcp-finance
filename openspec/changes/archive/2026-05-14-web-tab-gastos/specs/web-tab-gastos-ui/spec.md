## ADDED Requirements

### Requirement: Aba Gastos exibe distribuição de gastos do mês
A aba Gastos SHALL exibir o total gasto no mês, a distribuição por grupos em DonutChart, o ranking de categorias em BarList e a seção de novos gastos.

#### Scenario: DonutChart mostra distribuição por grupo
- **WHEN** usuário abre aba Gastos com mês selecionado
- **THEN** DonutChart é renderizado com fatias proporcionais ao `total_gasto` de cada grupo

#### Scenario: DonutChart limitado a 6 grupos
- **WHEN** existem mais de 6 grupos de gastos
- **THEN** top 5 são exibidos e o restante é agrupado em "Outros"

#### Scenario: BarList mostra categorias rankeadas
- **WHEN** dados de categorias carregam
- **THEN** BarList exibe categorias ordenadas por `total_gasto DESC` com barra proporcional e valor formatado em BRL

#### Scenario: Valores do BarList formatados como moeda
- **WHEN** BarList renderiza
- **THEN** coluna de valor usa `formatBRL()` (ex: "R$ 1.234,56")

#### Scenario: Total gasto exibido no topo
- **WHEN** dados de grupos carregam
- **THEN** total (soma de `total_gasto` de todos os grupos) é exibido como `<Metric>` no topo da aba

#### Scenario: Seção de novos gastos com badge NOVO
- **WHEN** `novos` tem itens
- **THEN** seção "Novos este mês" é exibida com badge "NOVO" ao lado de cada item

#### Scenario: Sem novos gastos não exibe seção
- **WHEN** `novos` é array vazio
- **THEN** seção "Novos este mês" não é renderizada

#### Scenario: Estado de loading durante fetch
- **WHEN** chamada GET /api/gastos está em andamento
- **THEN** aba exibe LoadingCard

#### Scenario: Estado de erro em falha
- **WHEN** GET /api/gastos falha
- **THEN** aba exibe ErrorCard com mensagem
