## ADDED Requirements

### Requirement: Gráficos financeiros SHALL migrar para Tremor/Recharts preservando semântica
O sistema SHALL exibir os gráficos de cashflow, categorias de gastos e composição de patrimônio com componentes Tremor/Recharts, mantendo séries, eixos e leitura de tendências já disponíveis ao usuário.

#### Scenario: Série real e projetada de cashflow permanece distinguível
- **WHEN** a aba Previsão é renderizada
- **THEN** o gráfico de cashflow mostra série real e série projetada com distinção visual clara

#### Scenario: Gráfico de categorias mantém ranking por gasto
- **WHEN** a aba Gastos é renderizada
- **THEN** o gráfico de categorias mantém ordem de maior para menor gasto e exibe valores formatados em BRL

### Requirement: Cores semânticas SHALL ser preservadas nos gráficos migrados
O sistema SHALL manter convenções semânticas de cor (alta positiva, queda negativa, neutro informativo) nos gráficos da aplicação após a migração.

#### Scenario: Tonicidade semântica preservada
- **WHEN** um valor negativo de cashflow é exibido
- **THEN** o elemento visual correspondente utiliza cor semântica negativa

#### Scenario: Tonicidade de crescimento preservada
- **WHEN** um indicador representa evolução positiva
- **THEN** o elemento visual correspondente utiliza cor semântica positiva

### Requirement: Gráficos SHALL permanecer responsivos em mobile e desktop
O sistema SHALL manter legibilidade de labels e interação mínima aceitável para larguras mobile e desktop.

#### Scenario: Mobile mantém legibilidade
- **WHEN** o usuário acessa com viewport mobile
- **THEN** os gráficos renderizam sem sobreposição crítica de labels

#### Scenario: Desktop mantém densidade informacional
- **WHEN** o usuário acessa com viewport desktop
- **THEN** os gráficos mostram eixos, séries e legenda sem truncamento crítico
