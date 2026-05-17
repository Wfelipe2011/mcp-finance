## MODIFIED Requirements

### Requirement: Cards de insight com semântica visual por tipo
O sistema SHALL exibir cada insight na aba Insights com borda e/ou ícone de cor semântica baseada no tipo: positivo usa `--color-trading-up`, negativo usa `--color-trading-down`, neutro/informativo usa `--color-info`.

#### Scenario: Insight positivo com destaque verde
- **GIVEN** que um insight é classificado como positivo
- **WHEN** o usuário acessa a aba Insights
- **THEN** o card do insight exibe borda ou ícone com `--color-trading-up`

#### Scenario: Insight negativo com destaque vermelho
- **GIVEN** que um insight é classificado como negativo
- **WHEN** o usuário acessa a aba Insights
- **THEN** o card do insight exibe borda ou ícone com `--color-trading-down`

#### Scenario: Insight neutro com destaque azul
- **GIVEN** que um insight é classificado como neutro ou informativo
- **WHEN** o usuário acessa a aba Insights
- **THEN** o card do insight exibe borda ou ícone com `--color-info`

### Requirement: Layout de cards de insight tokenizado
O sistema SHALL renderizar os cards de insight com `--color-surface-card-dark` (modo escuro) ou `--color-surface-soft-light` (modo claro), tipografia `body-md` e espaçamento via tokens.

#### Scenario: Cards renderizam com superfície tokenizada
- **WHEN** a aba Insights é renderizada em modo escuro
- **THEN** o fundo dos cards usa `--color-surface-card-dark`

### Requirement: Nenhuma cor hardcoded na aba Insights
O sistema SHALL renderizar a aba Insights sem nenhum valor hex de cor direto fora das variáveis CSS.

#### Scenario: Inspeção de código sem cores hardcoded
- **WHEN** o arquivo `Insights.tsx` é inspecionado
- **THEN** não existe nenhum valor hex de cor direto fora das variáveis CSS
