## ADDED Requirements

### Requirement: Card MUI substitui Card Tremor
O sistema SHALL usar `Paper` ou `Card` do `@mui/material` com `elevation={1}` e `sx={{ borderRadius: 2, p: 2 }}` no lugar de todos os `Card` do Tremor. O visual SHALL seguir o padrão Material Design com sombra sutil.

#### Scenario: Card renderiza conteúdo filho
- **WHEN** um componente usa `<Paper elevation={1}>`
- **THEN** o conteúdo é exibido com fundo branco, bordas arredondadas e sombra level 1

### Requirement: Typography MUI substitui Text e Metric Tremor
O sistema SHALL usar `Typography` do `@mui/material` com variantes adequadas: `variant="h4"` para métricas principais (substitui `Metric`), `variant="body2"` para texto de suporte (substitui `Text`), `variant="overline"` para labels de seção (substitui `Text` com `className="text-xs uppercase"`).

#### Scenario: Métrica principal formatada
- **WHEN** o cashflow do mês é exibido na aba Resumo
- **THEN** o valor é renderizado com `Typography variant="h4"` em verde (positivo) ou vermelho (negativo)

### Requirement: Chip MUI substitui Badge Tremor
O sistema SHALL usar `Chip` do `@mui/material` com `size="small"` no lugar de `Badge` do Tremor em `FlagPills` e `RunwayIndicator`. Cores SHALL ser mapeadas semanticamente: emerald→success, amber→warning, red→error usando a prop `color` do Chip.

#### Scenario: Flags de digest exibidas como Chips
- **WHEN** o digest retorna um array de flags
- **THEN** cada flag é exibida como um `Chip size="small"` com cor semântica (success/warning/error)

### Requirement: LinearProgress MUI substitui ProgressBar Tremor
O sistema SHALL usar `LinearProgress` do `@mui/material` no lugar de `ProgressBar` do Tremor em `CompromissosLista` e `AnomaliasList`. A prop `value` SHALL ser um número de 0 a 100 e `color` SHALL ser semântico.

#### Scenario: Progresso de compromisso exibido
- **WHEN** um compromisso tem 3 de 12 parcelas pagas
- **THEN** `LinearProgress` exibe 25% preenchido com cor `primary`

### Requirement: Select nativo MUI substitui select nativo em MonthPicker
O sistema SHALL usar `Select` + `MenuItem` do `@mui/material` com `size="small"` e `fullWidth` no componente `MonthPicker`. O estilo SHALL seguir o padrão outlined do Material Design.

#### Scenario: Meses disponíveis listados
- **WHEN** a API `/api/meses` retorna uma lista de meses
- **THEN** o Select exibe cada mês como `MenuItem` e o mês mais recente é pré-selecionado

### Requirement: CircularProgress MUI substitui spinner em LoadingCard
O sistema SHALL usar `CircularProgress` do `@mui/material` no lugar do spinner Tremor em `LoadingCard`. O componente SHALL centralizar o spinner com texto de carregamento em `Typography variant="body2"`.

#### Scenario: Loading state exibido
- **WHEN** um fetch de API está em andamento
- **THEN** `CircularProgress` é exibido centralizado dentro de um `Paper`
