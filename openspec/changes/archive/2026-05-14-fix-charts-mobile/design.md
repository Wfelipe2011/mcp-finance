## Context

Viewport mobile típico: 390px. Com `Container maxWidth="sm"` (600px) e padding lateral, a área útil é ~358px. 

Os gráficos afetados e seus problemas:

| Componente | Problema | Margem atual |
|---|---|---|
| `GruposDonut.tsx` | Legenda lateral empurra donut | `margin={{ right: 120 }}` + `slotProps.legend` |
| `PatrimonioDonut.tsx` | Idem | `margin={{ right: 120 }}` + `slotProps.legend` |
| `CashflowAreaChart.tsx` | Labels "R$69.5k" truncadas | `margin={{ left: 60 }}` |
| `CategoriaBarList.tsx` | Nomes de categoria cortados | `margin={{ left: 110 }}` |
| `InvestimentosBarChart.tsx` | Labels BRL Y-axis cortadas | `margin={{ left: 70 }}` |

## Goals / Non-Goals

**Goals:**
- Donuts renderizáveis e legíveis em 390px de largura
- Labels de eixo Y não truncadas em mobile
- Sem regressão em desktop

**Non-Goals:**
- Redesenho completo dos gráficos
- Trocar biblioteca de charts

## Decisions

### Donuts: remover legenda lateral, usar legenda separada abaixo

MUI X Charts `PieChart` com `slotProps.legend` posicionado lateralmente exige `margin={{ right: N }}` alto. Ao remover a legenda embutida (`legend={{ hidden: true }}`) e criar um componente de legenda customizado abaixo, o PieChart pode usar toda a largura disponível sem margin lateral.

**Estrutura nova:**
```tsx
<Box>
  <PieChart
    series={[{ data, ... }]}
    slotProps={{ legend: { hidden: true } }}  // ← remove legenda embutida
    margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
    height={220}
  />
  {/* Legenda customizada */}
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
    {data.map((item) => (
      <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
        <Typography variant="caption">{item.label}</Typography>
      </Box>
    ))}
  </Box>
</Box>
```

### Gráficos de barra/área: usar useMediaQuery para margem responsiva

```tsx
const isMobile = useMediaQuery('(max-width:600px)')
// CashflowAreaChart:
margin={{ left: isMobile ? 48 : 60 }}
// CategoriaBarList:
margin={{ left: isMobile ? 80 : 110 }}
// InvestimentosBarChart:
margin={{ left: isMobile ? 52 : 70 }}
```

Complementar com `formatBRL` mais curto em mobile: "R$1.2k" em vez de "R$1.234" (já existe `formatBRLShort`).

## Risks / Trade-offs

- **[Risco]** Legenda abaixo dos donuts ocupa mais altura vertical — aceitável pois melhora muito a legibilidade
- **[Trade-off]** `useMediaQuery` adiciona uma re-render por breakpoint — insignificante para esses componentes
