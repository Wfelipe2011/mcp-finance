## Context

`App.tsx` define:
```tsx
const [selectedMonth, setSelectedMonth] = useState("")
```

`MonthPicker.tsx` inicializa com `data[0]` (mês mais recente) quando o value é `""`. A cada reload, o filtro volta ao mês mais recente independente da última seleção do usuário.

## Goals / Non-Goals

**Goals:**
- Persistir `selectedMonth` no `localStorage` com chave `'selectedMonth'`
- Restaurar na próxima abertura do app

**Non-Goals:**
- Validar se o mês salvo ainda existe na lista (caso o banco de dados seja resetado)
- Sincronizar estado entre abas

## Decisions

### Inicializar do localStorage

```tsx
const [selectedMonth, setSelectedMonth] = useState(
  localStorage.getItem('selectedMonth') ?? ""
)
```

### Wrapper de setter que persiste

```tsx
const handleMonthChange = (month: string) => {
  localStorage.setItem('selectedMonth', month)
  setSelectedMonth(month)
}
```

Passar `handleMonthChange` onde `setSelectedMonth` era passado (`<MonthPicker onChange={handleMonthChange} />`).

### Não validar mês obsoleto

Se o mês salvo não existir na lista, `MonthPicker` vai cair no fallback `data[0]` naturalmente — comportamento seguro sem necessidade de validação extra.

## Risks / Trade-offs

- **[Risco trivial]** Se localStorage estiver indisponível (modo privado extremo) → fallback para `""` (comportamento atual)
