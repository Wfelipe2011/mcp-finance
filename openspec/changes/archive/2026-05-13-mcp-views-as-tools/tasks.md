## 1. Remover Resources e atualizar capabilities

- [x] 1.1 Remover o array `RESOURCES` e o método `registerResources()` de `FinanceMcpServer.ts`
- [x] 1.2 Atualizar capabilities para `{ tools: {} }` (remover `resources: {}`)

## 2. Tools estáticas (7 sem parâmetros)

- [x] 2.1 Registrar `get_overview` com `SELECT * FROM v_overview`
- [x] 2.2 Registrar `get_bank_summary` com `SELECT * FROM v_bank_summary`
- [x] 2.3 Registrar `get_credit_summary` com `SELECT * FROM v_credit_summary`
- [x] 2.4 Registrar `get_investment_summary` com `SELECT * FROM v_investment_summary`
- [x] 2.5 Registrar `get_net_worth` com `SELECT * FROM v_net_worth`
- [x] 2.6 Registrar `get_investment_maturity` com `SELECT * FROM v_investment_maturity`
- [x] 2.7 Registrar `get_credit_alerts` com `SELECT * FROM v_credit_alerts`

## 3. Tool get_monthly_cashflow

- [x] 3.1 Definir schema Zod: `{ months: z.number().int().min(1).max(36).default(13) }`
- [x] 3.2 Construir SQL dinâmico usando `DATE('now', 'start of month', '-${months-1} months')` com noise filter
- [x] 3.3 Registrar tool com description e handler

## 4. Tool get_spending_by_cat

- [x] 4.1 Definir schema Zod: `short_days` (1–90, default 30), `long_days` (2–180, default 90) com `.refine(s => s.short_days < s.long_days)`
- [x] 4.2 Construir SQL com duas janelas: `total_short` (short_days) e `total_long` (long_days), com noise filter
- [x] 4.3 Registrar tool com description e handler

## 5. Tool get_top_categories

- [x] 5.1 Definir schema Zod: `days` (7–90, default 30), `limit` (1–50, default 10)
- [x] 5.2 Construir SQL com CTE: `WHERE date >= DATE('now', '-${days} days')` e `LIMIT ${limit}`
- [x] 5.3 Registrar tool com description e handler

## 6. Tool get_budget_5030_20

- [x] 6.1 Definir schema Zod: `spending_days` (1–90, default 30), `income_months` (1–12, default 3)
- [x] 6.2 Construir SQL com CTE `renda` usando `LIMIT ${income_months}` e `WHERE date >= DATE('now', '-${spending_days} days')`
- [x] 6.3 Registrar tool com description e handler

## 7. Validação

- [x] 7.1 Subir servidor e confirmar `tools/list` retorna 12 tools (11 de leitura + sync)
- [x] 7.2 Confirmar que `initialize` não inclui `resources` nas capabilities
- [x] 7.3 Testar `get_overview` e confirmar JSON array válido
- [x] 7.4 Testar `get_monthly_cashflow` sem parâmetro → 13 meses
- [x] 7.5 Testar `get_monthly_cashflow` com `{ months: 6 }` → 6 meses
- [x] 7.6 Testar `get_spending_by_cat` com `{ short_days: 15, long_days: 45 }` → colunas corretas
- [x] 7.7 Testar `get_top_categories` com `{ days: 60, limit: 5 }` → 5 categorias
- [x] 7.8 Testar `get_budget_5030_20` com `{ income_months: 6 }` → renda de 6 meses
- [x] 7.9 Testar parâmetro inválido (ex: `months: 0`) → `isError: true`
