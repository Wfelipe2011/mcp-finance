## 1. BunPgAdapter — parse defensivo na leitura

- [x] 1.1 Criar função utilitária `parseJsonbField<T>` no BunPgAdapter que faz JSON.parse se o valor for string, retornando null em caso de erro
- [x] 1.2 Aplicar `parseJsonbField` em `getDigestData` para os campos `notable_expenses` e `structured_summary`
- [x] 1.3 Aplicar `parseJsonbField` em `getDigestMensal` para os campos `notable_expenses` e `structured_summary`

## 2. BunPgAdapter — prevenção de double-encoding na escrita

- [x] 2.1 Em `upsertDigest`, antes de `JSON.stringify(data.notable_expenses)`, verificar se o valor é string e fazer parse para array/objeto nativo primeiro
- [x] 2.2 Em `upsertDigest`, aplicar o mesmo tratamento para `data.structured_summary`

## 3. Frontend — guard defensivo no componente

- [x] 3.1 Em `NotableExpenses.tsx`, substituir `!expenses || expenses.length === 0` por `!Array.isArray(expenses) || expenses.length === 0`

## 4. Validação

- [x] 4.1 Reiniciar a API e navegar até a aba Insights — confirmar que não há mais crash
- [x] 4.2 Verificar no browser que `notable_expenses` retornado pela API é array (ou null), não string
- [x] 4.3 Rodar `cd client && bun run build` e confirmar build sem erros TypeScript
