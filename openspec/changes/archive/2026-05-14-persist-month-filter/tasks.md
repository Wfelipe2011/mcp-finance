## 1. Persistir selectedMonth no App.tsx

- [x] 1.1 Em `client/src/App.tsx`, alterar `useState("")` para `useState(localStorage.getItem('selectedMonth') ?? "")`
- [x] 1.2 Criar handler `const handleMonthChange = (month: string) => { localStorage.setItem('selectedMonth', month); setSelectedMonth(month) }`
- [x] 1.3 Substituir `setSelectedMonth` por `handleMonthChange` no prop `onChange` do `<MonthPicker>`

## 2. Validar

- [x] 2.1 Rodar `bun run client:build` e confirmar zero erros TypeScript
- [x] 2.2 Abrir app, selecionar fev/2026, recarregar a página: filtro deve continuar em fev/2026
- [x] 2.3 Abrir app sem localStorage (modo incógnito): deve carregar mês mais recente normalmente
