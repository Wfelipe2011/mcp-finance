## 1. Redesenhar GruposDonut sem legenda lateral

- [x] 1.1 Em `client/src/components/GruposDonut.tsx`, remover `margin={{ right: 120 }}` do PieChart e definir `margin={{ top: 10, bottom: 10, left: 10, right: 10 }}`
- [x] 1.2 Em `slotProps.legend`, definir `hidden: true` para remover legenda embutida
- [x] 1.3 Adicionar legenda customizada abaixo do PieChart: `<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>` com bolinha colorida + `Typography variant="caption"` para cada item

## 2. Redesenhar PatrimonioDonut sem legenda lateral

- [x] 2.1 Em `client/src/components/PatrimonioDonut.tsx`, aplicar as mesmas mudanças do passo 1.1 e 1.2
- [x] 2.2 Adicionar legenda customizada abaixo do PieChart (mesmo padrão do GruposDonut)

## 3. Margem responsiva no CashflowAreaChart

- [x] 3.1 Em `client/src/components/CashflowAreaChart.tsx`, importar `useMediaQuery` de `@mui/material`
- [x] 3.2 Adicionar `const isMobile = useMediaQuery('(max-width:600px)')`
- [x] 3.3 Substituir `margin={{ left: 60 }}` por `margin={{ left: isMobile ? 48 : 60 }}`

## 4. Margem responsiva no CategoriaBarList

- [x] 4.1 Em `client/src/components/CategoriaBarList.tsx`, importar `useMediaQuery` de `@mui/material`
- [x] 4.2 Adicionar `const isMobile = useMediaQuery('(max-width:600px)')`
- [x] 4.3 Substituir `margin={{ left: 110 }}` por `margin={{ left: isMobile ? 80 : 110 }}`

## 5. Margem responsiva no InvestimentosBarChart

- [x] 5.1 Em `client/src/components/InvestimentosBarChart.tsx`, importar `useMediaQuery` de `@mui/material`
- [x] 5.2 Adicionar `const isMobile = useMediaQuery('(max-width:600px)')`
- [x] 5.3 Substituir `margin={{ left: 70 }}` por `margin={{ left: isMobile ? 52 : 70 }}`

## 6. Validar

- [x] 6.1 Rodar `bun run client:build` e confirmar zero erros TypeScript
- [x] 6.2 Abrir o browser em modo mobile (390px): donuts visíveis com legenda abaixo
- [x] 6.3 Confirmar que labels de eixo Y não são truncadas nos 3 gráficos de barra/área em mobile
- [x] 6.4 Confirmar que em desktop (1280px) o comportamento não regrediu
