## 1. Auditoria de padrões problemáticos

- [ ] 1.1 Rodar `rg -n 'color.*var\(--' client/src/App.tsx client/src/theme.ts` e documentar todas as ocorrências encontradas
- [ ] 1.2 Rodar `rg -n 'color.*var\(--' client/src/components/ client/src/tabs/` para identificar outros componentes com o mesmo padrão em props de ButtonBase

## 2. Correção em App.tsx

- [ ] 2.1 Substituir `color: "var(--color-primary)"` no `sx` do `BottomNavigation` (`Mui-selected`) por `color: theme.palette.primary.main` — requer importar `useTheme` ou acessar o valor via `sx` callback `(theme) => ({ color: theme.palette.primary.main })`
- [ ] 2.2 Verificar demais usos de CSS variables em `App.tsx` que possam estar em posições de ButtonBase/interativos

## 3. Auditoria de theme.ts

- [ ] 3.1 Verificar se `background.paper`, `background.default`, `text.primary` e `text.secondary` em `theme.ts` causam problemas — testar em dev abrindo o app com modo escuro e claro, observando console
- [ ] 3.2 Se necessário, substituir CSS variables nesses campos por valores hex equivalentes (mapeados pelos tokens em `index.css`)

## 4. Validação local

- [ ] 4.1 Rodar `cd client && bun run build` — confirmar zero erros TypeScript
- [ ] 4.2 Subir dev server (`bun run client:dev`), abrir browser via VS Code tools (`open_browser_page`), navegar pelas abas e confirmar zero erros de console relacionados a MUI color
- [ ] 4.3 Confirmar que a aba selecionada no BottomNavigation exibe a cor primária (#fcd535) corretamente

## 5. Validação em produção

- [ ] 5.1 Após deploy, abrir `https://event.wfelipe.com.br` via browser tools e verificar que nenhum "MUI error #9" aparece no console
- [ ] 5.2 Navegar por todas as 6 abas e confirmar renderização sem crash
