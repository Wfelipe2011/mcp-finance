## Why

O método 50/30/20 é o framework mais recomendado por educadores financeiros brasileiros (XPI, Sicredi, FECAP) para orçamento familiar: 50% da renda em necessidades, 30% em desejos, 20% em poupança. Sem esse diagnóstico estrutural, o assistente consegue descrever gastos mas não consegue orientar o usuário sobre se seu padrão de consumo é saudável ou não. Uma view que mapeia categorias Pluggy para os três grupos e calcula os percentuais reais vs ideais dá ao modelo a base para recomendações acionáveis.

## What Changes

- Nova view `v_budget_5030_20`: 3 linhas (NECESSIDADES, DESEJOS, POUPANÇA) com o gasto real dos últimos 30 dias, a renda mensal observada (média das entradas reais dos 3 últimos meses completos — Opção C), o percentual real, o percentual ideal do método, o delta e um status ('OK', 'ACIMA', 'ABAIXO')

## Capabilities

### New Capabilities
- `orcamento-views`: View SQLite que implementa o diagnóstico 50/30/20 mapeando categorias Pluggy para os grupos de necessidades e desejos, calculando percentuais reais contra a renda observada e gerando status por grupo

### Modified Capabilities
- `db-schema`: schema.sql passa a incluir `CREATE VIEW IF NOT EXISTS` para `v_budget_5030_20`

## Impact

- `src/infrastructure/db/schema.sql`: adição da view
- `src/infrastructure/db/views/v_budget_5030_20.sql`: arquivo canônico da view
- `src/infrastructure/db/views.test.ts`: novos testes de integração contra `finance.db`
- Sem alteração nas tabelas, sem breaking changes, sem impacto no `bun run sync`
