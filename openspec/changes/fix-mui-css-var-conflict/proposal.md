## Why

O app em produção (`event.wfelipe.com.br`) crasha com **MUI error #9** ao renderizar o `BottomNavigation`. O `colorManipulator` interno do MUI tenta fazer parse matemático de `var(--color-primary)` para derivar cores de ripple/hover/alpha — algo que só funciona com valores `#hex`, `rgb()` ou `hsl()`. Essa regressão foi introduzida durante a `client-tabs-visual-migration`, que propagou CSS variables para contextos onde o MUI espera valores de cor resolvidos.

## What Changes

- Substituir `color: "var(--color-primary)"` no `sx` do `BottomNavigation` em `App.tsx` por referência ao token de palette do MUI (`"primary.main"` ou `theme.palette.primary.main`)
- Auditar e corrigir qualquer outro uso de CSS variables em posições que o MUI interpreta via `colorManipulator` (props de cor em ButtonBase, Badge, CircularProgress, etc.)
- Garantir que `theme.ts` não passe CSS variables para campos de palette que o MUI usa para derivação de cor (ex: `background.paper`, `text.primary` quando usados em overlay)
- Validar o fix em produção via navegação real no browser

## Capabilities

### New Capabilities
- `mui-color-contract`: Regra de uso de cor em componentes MUI — onde usar CSS variables (seguro: `sx` em Box/Typography/divs) vs. onde usar valores hex/palette (obrigatório: props de cor em ButtonBase e derivados, `createTheme` palette entries que MUI processa matematicamente)

### Modified Capabilities

## Impact

- `client/src/App.tsx` — correção do `sx` do `BottomNavigation`
- `client/src/theme.ts` — auditoria dos campos de palette
- Componentes que usam MUI ButtonBase (Button, IconButton, BottomNavigationAction, Tab) com `color` prop ou `sx.color` de CSS variable
- Produção: resolve crash que impede renderização da navbar em `event.wfelipe.com.br`
