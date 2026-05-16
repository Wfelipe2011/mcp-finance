## Context

O sistema já possui 4 views de snapshot patrimonial (v_overview, v_bank_summary, v_credit_summary, v_investment_summary). Todas respondem "quanto tenho agora". Para orientação financeira familiar, o assistente precisa de visão temporal: como o dinheiro entrou e saiu nos últimos meses, e onde foi gasto.

O banco SQLite local contém ~3.287 transações de jan/2025 a mai/2026, com ~65 categorias Pluggy em inglês. O principal desafio técnico é o **ruído**: transferências entre contas próprias, pagamentos de fatura e movimentações de investimento distorcem dramaticamente os valores brutos (representam >3x o volume de gastos reais). Qualquer view de cashflow deve excluir esse ruído embutido no SQL.

## Goals / Non-Goals

**Goals:**
- `v_monthly_cashflow`: fluxo de caixa mensal real dos últimos 13 meses (janela deslizante via `DATE('now')`)
- `v_spending_by_cat`: ranking de gastos por categoria com janelas de 30d e 90d em uma única query
- Filtro de ruído centralizado em constante SQL (lista de categorias a excluir)
- Testes de integração contra `finance.db` validando consistência entre as views

**Non-Goals:**
- Não classificar categorias em português (categorias Pluggy ficam em inglês)
- Não implementar filtros paramétricos — as views são fixas (Opção A); o MCP recebe o resultado pronto
- Não alterar tabelas existentes

## Decisions

**D1 — Opção A: janelas fixas com `DATE('now')`**
Views usam `DATE('now', '-30 days')` e `DATE('now', '-13 months')` em tempo de execução. Cada consulta retorna dados sempre atualizados sem necessidade de parâmetros. Alternativa descartada: views sem filtro de tempo (Opção B) exigiriam que o MCP filtrasse — mais flexível mas transfere complexidade para a camada de aplicação.

**D2 — Lista canônica de categorias de ruído**
Categorias excluídas (hardcoded no SQL):
- `'Same person transfer'`, `'Transfers'`, `'Credit card payment'`, `'Investments'`, `'Fixed income'`, `'Credit card fees'`
- Padrão `LIKE 'Transfer - %'` para variantes (Transfer - PIX, Transfer - TED, Transfer - Internal, Transfer - Bank Slip)

Racional: estas categorias representam movimentação de dinheiro entre contas/instrumentos, não gasto ou receita real. Incluí-las faz fevereiro/2026 parecer R$213k de saídas quando o real é ~R$60k.

**D3 — `v_spending_by_cat`: apenas DEBIT, apenas categorias não-ruído**
Entradas (CREDIT) nas categorias de gasto são cashbacks, estornos e devoluções — volumes pequenos que não representam padrão de gasto. A view foca em saídas (type = 'DEBIT', amount < 0) para refletir o comportamento de consumo.

**D4 — Arquivos canônicos em `views/v_*.sql`**
Padrão já estabelecido nas views anteriores: o SQL canônico vive em `src/infrastructure/db/views/v_*.sql` e é copiado para `schema.sql`. Mantemos o padrão.

## Risks / Trade-offs

- **[Risco] PIX entre contas diferentes do usuário em bancos diferentes** → A categoria `Transfers` cobre a maioria, mas um PIX categorizado como `Transfer - PIX` para conta própria em outro banco pode não ter esse padrão. Mitigação: o filtro `LIKE 'Transfer - %'` e a categoria `'Same person transfer'` capturam a maioria dos casos. Casos residuais são raros e aceitáveis.
- **[Risco] Fevereiro/2026 tem volume anômalo (~R$60k mesmo após filtro)** → Pode ser um mês com evento pontual (IPTU, 13º, movimentação grande). A view expõe o dado; o MCP é responsável por contextualizar outliers.
- **[Trade-off] Janela de 90d para `v_spending_by_cat` inclui meses com comportamento diferente** → Preferível a 30d isolado porque suaviza sazonalidade. O MCP pode comparar as duas colunas (30d vs 90d) para detectar tendências.
