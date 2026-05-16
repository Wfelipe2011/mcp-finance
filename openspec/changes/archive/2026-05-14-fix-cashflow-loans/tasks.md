## 1. Banco — cube_cashflow_mensal

- [x] 1.1 Em `gold-cubes.sql`, adicionar JOIN com `transactions_enriched te` na VIEW `cube_cashflow_mensal` (via `fc.transaction_id = te.id`) para acessar `te.operation_type`
- [x] 1.2 Adicionar coluna `total_emprestimos` na SELECT: soma de `ABS(amount_signed)` filtrado por `transaction_kind = 'INCOME' AND te.operation_type = 'OPERACAO_CREDITO'`
- [x] 1.3 Adicionar coluna `total_receitas_operacionais` = `total_receitas - COALESCE(total_emprestimos, 0)`
- [x] 1.4 Executar a VIEW no banco e validar: Fev/2026 deve ter `total_emprestimos ≈ 58.000` e `total_receitas_operacionais ≈ 47.000`

## 2. API — getCashflowMensal

- [x] 2.1 Em `BunPgAdapter.ts`, adicionar `total_emprestimos` e `total_receitas_operacionais` ao SELECT e ao objeto de retorno de `getCashflowMensal()`
- [x] 2.2 Testar endpoint `GET /cashflow?month=2026-02` e confirmar as novas colunas no JSON

## 3. Client — Resumo.tsx

- [x] 3.1 Em `client/src/api/types.ts`, adicionar `total_emprestimos?: number` e `total_receitas_operacionais?: number` ao tipo `CashflowMensal`
- [x] 3.2 Em `Resumo.tsx`, no card de grade, substituir `cashflow.total_receitas` por `cashflow.total_receitas_operacionais ?? cashflow.total_receitas`
- [x] 3.3 Quando `cashflow.total_emprestimos > 0`, exibir badge/chip abaixo do valor de Receitas: `+ R$ X.XXX (empréstimo)` com cor neutra (info/warning)
- [x] 3.4 Validar visualmente no browser: Fev/2026 mostra valor operacional correto com badge de empréstimo
