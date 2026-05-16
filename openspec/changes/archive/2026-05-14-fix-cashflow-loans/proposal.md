## Why

Depósitos de empréstimos (`operation_type = 'OPERACAO_CREDITO'`) são classificados como `INCOME` com `is_real_cashflow = true` no enrichment. Isso faz sentido para o fluxo de caixa bruto (dinheiro entrou na conta), mas distorce o resumo mensal ao inflar `total_receitas` com valores que são dívida, não renda.

Impacto medido (Fev/2026):
- `Depósito de empréstimo` R$43.000 + R$15.000 → `total_receitas = R$141.760` (vs receita operacional real de ~R$47.000)

O `ai_monthly_digest` já computa `cashflow_real` separando `debt_inflows` corretamente — o campo existe no banco. O problema é que a **API REST** expõe `cube_cashflow_mensal` diretamente, sem coluna separada de empréstimos, e o **Resumo.tsx** exibe o `total_receitas` bruto no card de grade.

## What Changes

1. **Cube SQL**: adicionar coluna `total_emprestimos` ao `cube_cashflow_mensal` separando `operation_type = 'OPERACAO_CREDITO'`; criar coluna `total_receitas_operacionais = total_receitas - total_emprestimos`
2. **API**: expor as novas colunas no endpoint `/cashflow`
3. **Client**: no `Resumo.tsx`, o card de "Receitas" exibe `total_receitas_operacionais` com tooltip/badge indicando o valor de empréstimos separado

## Capabilities

### New Capabilities
- `cashflow-loan-separation`: Separação de empréstimos (`operation_type=OPERACAO_CREDITO`) da receita operacional no cube de cashflow e na UI.

### Modified Capabilities
- `cashflow-views`: `cube_cashflow_mensal` adiciona coluna `total_emprestimos` e `total_receitas_operacionais`

## Impact

- `gold-cubes.sql`: VIEW `cube_cashflow_mensal` ganha 2 novas colunas
- `BunPgAdapter.ts`: `getCashflowMensal()` expõe as novas colunas
- `client/src/api/types.ts`: tipo `CashflowMensal` ganha campos opcionais
- `client/src/tabs/Resumo.tsx`: card de Receitas usa `total_receitas_operacionais`
- Depende de `fix-dedup-transactions` + `fix-enrichment-kind` para dados limpos
