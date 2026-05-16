## Context

O app usa MUI como sistema de design após a migração recente de Tremor. O MUI possui suporte nativo a temas claro/escuro via `createTheme({ palette: { mode } })`. Atualmente não há `ThemeProvider` no app — o tema default (light) é aplicado implicitamente.

Existem dois pontos de fricção no código atual:
1. **Wrapper raiz** em `App.tsx` usa classes Tailwind hardcoded (`bg-gray-50`, `text-gray-900`) que não respondem ao tema MUI.
2. **Valores de `bgcolor` hardcoded** em dois componentes (`grey.50`, `primary.50`) que quebram ou ficam visualmente errados no modo escuro.

Todos os demais componentes já usam tokens semânticos do MUI (`text.primary`, `background.paper`, `error.main`, etc.) e adaptam automaticamente.

## Goals / Non-Goals

**Goals:**
- Toggle manual entre light e dark mode com ícone sol/lua no header
- Persistir preferência do usuário em `localStorage` (chave: `colorMode`)
- Corrigir os pontos hardcoded para que todo o app responda ao tema
- Zero dependências novas além das já instaladas (`@mui/material`, `@mui/icons-material`)

**Non-Goals:**
- Detectar `prefers-color-scheme` do sistema operacional automaticamente
- Temas customizados além de light/dark padrão do MUI
- Animação de transição entre temas
- Suporte a múltiplos temas ou paletas customizadas

## Decisions

### 1. Estado do tema em `App.tsx` via `useState` + `localStorage`

O estado `colorMode: "light" | "dark"` vive em `App.tsx` junto com o `ThemeProvider`. A inicialização lê `localStorage.getItem("colorMode")` e faz fallback para `"light"`. A troca persiste imediatamente via `localStorage.setItem`.

**Alternativa considerada**: Context API separado para expor `toggleColorMode` a componentes filhos. Rejeitado — nenhum componente filho precisa chamar o toggle; só o header precisa.

### 2. `Box` MUI substitui o `<div>` raiz com classes Tailwind

A div `className="max-w-md mx-auto min-h-screen bg-gray-50 px-4"` será substituída por `<Box sx={{ maxWidth: 448, mx: "auto", minHeight: "100vh", bgcolor: "background.default", px: 2 }}>`. O `CssBaseline` do MUI garante que o `body` também receba a cor de fundo correta.

**Alternativa considerada**: Manter Tailwind + adicionar classe `dark:bg-gray-900` com Tailwind dark mode. Rejeitado — cria dois sistemas de tema em paralelo; o MUI já resolve isso com `CssBaseline`.

### 3. Fix de `bgcolor: "grey.50"` → `"background.paper"`

`grey.50` é quase branco (hardcoded na escala de cinzas do MUI). `background.paper` é o token correto para superfícies que devem contrastar levemente com o fundo — adapta automaticamente em dark mode para cinza escuro (~`#121212` / `#1e1e1e`).

### 4. Fix de `bgcolor: "primary.50"` → `alpha(theme.palette.primary.main, 0.12)`

`primary.50` não existe na palette dark por default do MUI — resulta em `undefined`. A alternativa correta é usar `alpha()` do `@mui/material/styles` com opacidade 12%, que mantém o visual de "card com toque azul" em ambos os modos. Para acessar o tema dentro do componente, usar `useTheme()`.

## Risks / Trade-offs

- **`CssBaseline` muda estilos globais de body** → Mitigation: é exatamente o propósito; verificar no browser que não há regressão visual nas margens/padding globais.
- **Tailwind residual (`space-y-3`, `flex`, `gap-2`, etc.)** → Sem risco: essas classes são de layout e não dependem de cor; funcionam independente do tema.
- **`primary.50` inexistente em dark** → Já mitigado pela decisão 4 acima.
