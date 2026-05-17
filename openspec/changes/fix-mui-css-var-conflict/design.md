## Context

O projeto usa um modelo de estilização híbrido: tokens CSS customizados (`var(--color-*)`) + componentes MUI com `createTheme`. A migração `client-tabs-visual-migration` propagou os tokens CSS para dentro de `sx` props e do `createTheme`, o que funciona corretamente em `Box`, `Typography` e divs genéricos — mas quebra quando CSS variables chegam a posições onde MUI executa `colorManipulator.decomposeColor()`.

O MUI chama `decomposeColor` internamente para derivar:
- Cor de ripple: `alpha(color, 0.3)`
- Estados hover/focus: `lighten(color, 0.1)`
- Contrastes automáticos: `getContrastRatio(color, '#fff')`

Essa função suporta apenas `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `color()` — **não** CSS variables.

O crash ocorre especificamente no `BottomNavigation`, onde `Mui-selected` com `color: "var(--color-primary)"` dispara o ripple do `ButtonBase`, que chama `alpha("var(--color-primary)", 0.3)` → exception.

## Goals / Non-Goals

**Goals:**
- Eliminar o crash MUI error #9 em produção
- Estabelecer uma regra clara de onde CSS variables são seguras vs. onde usar hex/palette
- Corrigir `App.tsx` e auditar `theme.ts` para posições de risco
- Validar em produção via browser após o fix

**Non-Goals:**
- Migrar todo o sistema de volta para hex (o sistema de tokens CSS é válido e correto em sx de elementos genéricos)
- Reformar o `createTheme` além dos campos problemáticos
- Adicionar CSS Variables no MUI v5 (feature do MUI v6/Pigment CSS — não é o escopo)

## Decisions

### D1: Manter CSS variables em `sx` de elementos genéricos, corrigir apenas posições problemáticas

**Decisão:** Não reverter toda a migração. Identificar cirurgicamente as posições onde o MUI chama `colorManipulator` e substituir apenas essas.

**Alternativas consideradas:**
- Reverter tudo para hex → desfaz trabalho válido da migração, cria divergência com o design system
- Usar `var()` no createTheme com fallback `var(--color-primary, #fcd535)` → não ajuda, MUI ainda recebe a string com `var()`

**Regra derivada:**
```
SEGURO com CSS var():
  sx={{ color: "var(...)" }}  em Box, Typography, Paper, div
  sx={{ bgcolor: "var(...)" }}
  sx={{ border: "... var(...)" }}

PROIBIDO com CSS var():
  Prop color= em ButtonBase e derivados (BottomNavigationAction, Button, Tab, Chip)
  createTheme({ palette.*.main })
  createTheme({ palette.background }) → pode ser seguro, mas monitorar
```

### D2: No BottomNavigation, usar a convenção de palette key do MUI

**Decisão:** Trocar `color: "var(--color-primary)"` no `Mui-selected` por `color: theme.palette.primary.main` ou pela string `"primary.main"` no contexto de `sx`.

**Como:** O `sx` do MUI suporta resolver palette keys como strings (`"primary.main"`), que retorna o valor hex real — sem passar pelo `colorManipulator`.

### D3: Auditoria estática via grep antes de corrigir

**Decisão:** Antes de fazer edições, rodar busca por padrões de risco:
```bash
# CSS var em prop color= de componentes MUI interativos
rg 'color.*var\(--' client/src/
# CSS var em createTheme palette entries obrigatórios  
rg 'main.*var\(|var\(.*main' client/src/theme.ts
```

## Risks / Trade-offs

- **Risco: outros componentes com o mesmo padrão** → Mitigação: auditoria grep completa antes de corrigir
- **Risco: `background.paper` e `text.primary` com CSS var no theme.ts** → Esses campos são usados pelo MUI internamente em overlay calculations em dark mode. Se quebrarem, mesmo fix — substituir por hex real
- **Risco: fix local não reflete em produção** → Mitigação: usar browser tool para validar `event.wfelipe.com.br` após deploy, ou validar localmente abrindo o build de produção

## Migration Plan

1. Rodar auditoria grep → identificar todos os locais problemáticos
2. Corrigir `App.tsx` BottomNavigation (`Mui-selected` color)
3. Corrigir quaisquer outros locais identificados
4. `bun run build` sem erros
5. Validar via browser no dev server local (sem erro no console)
6. Deploy → validar em `event.wfelipe.com.br`

**Rollback:** Git revert do commit — mudança é puramente no cliente.
