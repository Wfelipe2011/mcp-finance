## Why

O assistente financeiro precisa de visibilidade imediata sobre situações que requerem ação: cartões próximos ao vencimento e categorias de gasto que estão consumindo uma parcela desproporcional do orçamento. Sem alertas proativos, o usuário só descobre problemas quando já está pagando juros ou quando a fatura surpreende. Duas views de alerta cobrem os casos mais críticos do dia a dia financeiro brasileiro.

## What Changes

- Nova view `v_credit_alerts`: por cartão, mostra fatura, vencimento estimado (ccBalanceDueDate + 30 dias para o próximo ciclo), dias para vencer, mínimo e um status calculado ('VENCIDO', 'URGENTE', 'ATENÇÃO', 'OK')
- Nova view `v_top_categories_30d`: top 10 categorias de gasto dos últimos 30 dias por volume, com percentual do total de gastos do período, excluindo ruído — para o modelo identificar onde está indo o dinheiro

## Capabilities

### New Capabilities
- `alertas-views`: Duas views SQLite que expõem alertas de crédito (vencimento de faturas) e ranking de gastos recentes por categoria, permitindo ao MCP gerar insights proativos e identificar padrões de consumo relevantes

### Modified Capabilities
- `db-schema`: schema.sql passa a incluir `CREATE VIEW IF NOT EXISTS` para `v_credit_alerts` e `v_top_categories_30d`

## Impact

- `src/infrastructure/db/schema.sql`: adição das 2 novas views
- `src/infrastructure/db/views/v_credit_alerts.sql`: arquivo canônico da view
- `src/infrastructure/db/views/v_top_categories_30d.sql`: arquivo canônico da view
- `src/infrastructure/db/views.test.ts`: novos testes de integração contra `finance.db`
- Sem alteração nas tabelas, sem breaking changes, sem impacto no `bun run sync`
