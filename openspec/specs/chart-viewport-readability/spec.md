## ADDED Requirements

### Requirement: Componentes de gráfico SHALL preservar legibilidade em viewport mobile
The system SHALL renderizar gráficos com labels e eixos legíveis em viewport reduzida, sem colisões críticas.

#### Scenario: Labels de categorias longas
- **WHEN** categorias com nomes longos são exibidas no gráfico
- **THEN** os labels permanecem legíveis por truncamento, quebra ou abreviação controlada
- **AND** não aparecem concatenações visuais que alterem a leitura do texto

#### Scenario: Eixos e escala em gráfico compacto
- **WHEN** o gráfico é renderizado em viewport mobile
- **THEN** os valores de eixo permanecem visíveis sem corte crítico
- **AND** a leitura dos principais ticks continua possível

### Requirement: Tabelas analíticas SHALL suportar viewport estreita sem perda de leitura
The system SHALL manter leitura de colunas analíticas em mobile com layout responsivo e overflow controlado.

#### Scenario: Tabela com múltiplas colunas financeiras
- **WHEN** a tabela de categorias é renderizada em viewport reduzida
- **THEN** cabeçalhos e células de valor permanecem legíveis
- **AND** o usuário consegue alcançar linhas finais sem sobreposição da navegação fixa
