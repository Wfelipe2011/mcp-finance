## ADDED Requirements

### Requirement: BottomNavigation selected state usa palette key MUI, não CSS variable
O sistema SHALL estilizar a cor do item selecionado no `BottomNavigation` usando `theme.palette.primary.main` ou a string de palette key `"primary.main"` no contexto `sx` — nunca com `var(--color-primary)` diretamente.

#### Scenario: App carrega sem MUI error #9 no console
- **WHEN** o usuário acessa o app em produção
- **THEN** nenhum erro "Minified MUI error #9" ou "Unsupported color" aparece no console do browser

#### Scenario: Tab selecionada exibe cor primária corretamente
- **WHEN** o usuário toca em uma aba do BottomNavigation
- **THEN** o ícone e o label da aba selecionada ficam na cor primária (#fcd535) sem crash

### Requirement: CSS variables proibidas em posições de colorManipulator do MUI
O sistema SHALL garantir que nenhuma CSS variable `var(--)` seja passada como valor de `color` prop ou em campos de palette do `createTheme` que o MUI processa via `decomposeColor` (ripple, hover, alpha overlay).

#### Scenario: Auditoria estática não encontra CSS vars em props color de ButtonBase
- **WHEN** os arquivos `App.tsx`, `theme.ts` e componentes de tab são inspecionados
- **THEN** nenhum padrão `color.*var\(--` aparece em props de componentes que herdam de ButtonBase (Button, IconButton, BottomNavigationAction, Tab, Chip)

#### Scenario: createTheme não contém CSS var em campos de palette principais
- **WHEN** o arquivo `theme.ts` é inspecionado
- **THEN** os campos `palette.primary.main`, `palette.error.main`, `palette.success.main` contêm valores hex reais, não CSS variables

### Requirement: Regra de uso de cor documentada no design system
O sistema SHALL ter uma distinção clara: CSS variables são aceitas em `sx` de elementos genéricos (Box, Typography, Paper via bgcolor/border), mas valores hex/palette são obrigatórios onde o MUI executa cálculos matemáticos de cor.

#### Scenario: Build sem erros TypeScript
- **WHEN** `cd client && bun run build` é executado
- **THEN** saída contém `✓ built` sem nenhum erro de compilação TypeScript
