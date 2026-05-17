## MODIFIED Requirements

### Requirement: KPI principal de resultado mensal com hierarquia e semântica
O sistema SHALL exibir o resultado mensal (receitas − despesas) na aba Resumo com tipografia `number-display` (40px, 700) e cor semântica: `--color-trading-up` para resultado positivo, `--color-trading-down` para resultado negativo.

#### Scenario: Resultado positivo exibido em verde
- **GIVEN** que o resultado mensal é positivo
- **WHEN** o usuário acessa a aba Resumo
- **THEN** o valor é renderizado com a classe de cor `--color-trading-up` e tipografia `number-display`

#### Scenario: Resultado negativo exibido em vermelho
- **GIVEN** que o resultado mensal é negativo
- **WHEN** o usuário acessa a aba Resumo
- **THEN** o valor é renderizado com a classe de cor `--color-trading-down` e tipografia `number-display`

### Requirement: KPIs secundários com hierarquia menor
O sistema SHALL exibir patrimônio e runway como KPIs secundários com tipografia `number-md` (16px), sem conflitar visualmente com o KPI principal.

#### Scenario: Hierarquia visual preservada
- **WHEN** o usuário vê a aba Resumo
- **THEN** o resultado mensal é visivelmente maior e mais proeminente que patrimônio e runway

### Requirement: RunwayIndicator com cor semântica
O sistema SHALL exibir a cor do RunwayIndicator usando `runwayDaysToTone()`: positivo (runway longo), negativo (runway curto), warning (intermediário).

#### Scenario: Runway longo exibido em verde
- **GIVEN** que o runway é superior ao limiar positivo
- **WHEN** o RunwayIndicator é renderizado
- **THEN** o valor de dias é exibido com `--color-trading-up`

### Requirement: Componentes da aba Resumo tokenizados
O sistema SHALL renderizar `FlagPills`, `AnomaliasList`, `DigestNarrative`, `CompromissosLista` e `NotableExpenses` usando exclusivamente tokens CSS do design system (superfícies, bordas, tipografia, raios).

#### Scenario: Nenhuma cor hardcoded nos componentes da aba
- **WHEN** os arquivos dos componentes da aba Resumo são inspecionados
- **THEN** não existe nenhum valor hex de cor direto fora das variáveis CSS
