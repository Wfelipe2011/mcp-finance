## Why

O app de finanças familiares roda no celular em ambientes variados — noturno, com luz baixa. O modo escuro reduz o cansaço visual e melhora a experiência de leitura. Com a migração recente para MUI, a infraestrutura de tema já está 95% preparada; adicionar o toggle agora tem custo mínimo.

## What Changes

- Adicionar `ThemeProvider` + `createTheme` do MUI no `App.tsx` com suporte a `palette.mode: "light" | "dark"`
- Adicionar botão de toggle (ícone sol/lua) no header do app
- Persistir a preferência do usuário em `localStorage` (chave: `colorMode`)
- Substituir classes Tailwind hardcoded no wrapper raiz (`bg-gray-50`, `text-gray-900`) por tokens MUI responsivos ao tema
- Corrigir `bgcolor: "grey.50"` e `bgcolor: "primary.50"` hardcoded em componentes para valores dinâmicos do tema

## Capabilities

### New Capabilities

- `color-mode-toggle`: Toggle claro/escuro manual com persistência em localStorage, integrado ao ThemeProvider do MUI

### Modified Capabilities

(nenhuma — mudanças são puramente de implementação, sem alterações em requisitos de specs existentes)

## Impact

- `client/src/App.tsx`: Adiciona ThemeProvider, estado de colorMode, IconButton de toggle, troca `<div bg-gray-50>` por `<Box>`
- `client/src/components/DigestNarrative.tsx`: Fix `bgcolor: "primary.50"` → `alpha(theme.palette.primary.main, 0.12)` e `bgcolor: "grey.50"` → `background.paper`
- `client/src/tabs/Insights.tsx`: Fix `bgcolor: "grey.50"` → `background.paper`
- Sem mudanças em APIs, banco de dados ou dependências externas
- Sem breaking changes
