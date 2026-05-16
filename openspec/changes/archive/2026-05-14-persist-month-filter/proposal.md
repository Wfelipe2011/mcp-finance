## Why

O filtro de mês selecionado em `App.tsx` usa `useState("")` — ao recarregar a página, sempre volta para o mês mais recente. O usuário perde a seleção a cada reload, o que é incômodo durante análises financeiras históricas.

## What Changes

- Inicializar `selectedMonth` com `localStorage.getItem('selectedMonth') ?? ""`
- Salvar no localStorage sempre que o mês mudar

## Capabilities

### Modified Capabilities

- `month-filter-persistence`: O mês selecionado sobrevive a reloads do browser via localStorage

## Impact

- `client/src/App.tsx`: 2 linhas de mudança
