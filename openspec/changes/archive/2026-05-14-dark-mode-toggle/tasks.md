## 1. ThemeProvider e estado de colorMode

- [x] 1.1 Em `App.tsx`, importar `createTheme`, `ThemeProvider`, `CssBaseline` de `@mui/material`
- [x] 1.2 Em `App.tsx`, importar `LightModeRoundedIcon` e `DarkModeRoundedIcon` de `@mui/icons-material`
- [x] 1.3 Adicionar estado `colorMode` inicializado com `(localStorage.getItem("colorMode") as "light" | "dark") ?? "light"`
- [x] 1.4 Criar função `toggleColorMode` que alterna entre `"light"` e `"dark"` e persiste em `localStorage.setItem("colorMode", nextMode)`
- [x] 1.5 Criar `const theme = useMemo(() => createTheme({ palette: { mode: colorMode } }), [colorMode])`
- [x] 1.6 Envolver o JSX retornado com `<ThemeProvider theme={theme}><CssBaseline />...conteúdo...</ThemeProvider>`

## 2. Botão de toggle no header

- [x] 2.1 Importar `IconButton` de `@mui/material`
- [x] 2.2 Substituir o `<header className="py-4">` por `<Box component="header" sx={{ py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>`
- [x] 2.3 Adicionar `<IconButton onClick={toggleColorMode} size="small">` com ícone condicional: modo escuro → `<LightModeRoundedIcon />`, modo claro → `<DarkModeRoundedIcon />`

## 3. Fix do wrapper raiz

- [x] 3.1 Importar `Box` de `@mui/material`
- [x] 3.2 Substituir `<div className="max-w-md mx-auto min-h-screen bg-gray-50 px-4">` por `<Box sx={{ maxWidth: 448, mx: "auto", minHeight: "100vh", bgcolor: "background.default", px: 2 }}>`
- [x] 3.3 Substituir `<h1 className="text-xl font-bold text-gray-900">` por `<Typography variant="h6" fontWeight="bold">` (importar `Typography`)

## 4. Fix de bgcolor hardcoded em DigestNarrative.tsx

- [x] 4.1 Importar `alpha` de `@mui/material/styles` e `useTheme` de `@mui/material`
- [x] 4.2 Chamar `const theme = useTheme()` no corpo do componente
- [x] 4.3 Substituir `bgcolor: "grey.50"` (card vazio/fallback) por `bgcolor: "background.paper"`
- [x] 4.4 Substituir `bgcolor: "primary.50"` (card narrativa AI) por `bgcolor: alpha(theme.palette.primary.main, 0.12)`
- [x] 4.5 Substituir `color: "primary.dark"` no Typography por `color: "primary.main"` (funciona em ambos os modos)

## 5. Fix de bgcolor hardcoded em Insights.tsx

- [x] 5.1 Substituir `bgcolor: "grey.50"` (card de fallback sem digest) por `bgcolor: "background.paper"`

## 6. Verificação

- [x] 6.1 Build sem erros TypeScript: `cd client && bun run build`
- [x] 6.2 Testar no browser: alternar entre light e dark — todos os componentes (fundo, cards, gráficos, nav) mudam
- [x] 6.3 Testar persistência: recarregar a página e verificar que o modo escolhido é restaurado
- [x] 6.4 Testar fallback: apagar `localStorage.colorMode` e recarregar — app inicia em light mode
