## Why

As views existentes mostram saldo bancário, fatura de cartão e patrimônio em investimentos de forma separada. O assistente não consegue responder "qual é meu patrimônio líquido real?" nem "tenho investimentos vencendo em breve?". Sem patrimônio líquido (ativos menos dívidas), o usuário pode ter uma percepção distorcida da sua situação financeira — e sem visibilidade de vencimentos de renda fixa, pode perder o momento de resgatar ou reinvestir.

## What Changes

- Nova view `v_net_worth`: patrimônio líquido em uma linha — saldo bancário + investimentos menos fatura total dos cartões, com cada componente exposto para o modelo raciocinar
- Nova view `v_investment_maturity`: investimentos ativos com vencimento, mostrando dias para vencer e bucket de prazo (curto/médio/longo), ordenados por data de vencimento

## Capabilities

### New Capabilities
- `patrimonio-views`: Duas views SQLite que expõem patrimônio líquido consolidado e calendário de vencimentos de investimentos, permitindo ao MCP responder perguntas sobre saúde patrimonial e planejamento de liquidez

### Modified Capabilities
- `db-schema`: schema.sql passa a incluir `CREATE VIEW IF NOT EXISTS` para `v_net_worth` e `v_investment_maturity`

## Impact

- `src/infrastructure/db/schema.sql`: adição das 2 novas views
- `src/infrastructure/db/views/v_net_worth.sql`: arquivo canônico da view
- `src/infrastructure/db/views/v_investment_maturity.sql`: arquivo canônico da view
- `src/infrastructure/db/views.test.ts`: novos testes de integração contra `finance.db`
- Sem alteração nas tabelas, sem breaking changes, sem impacto no `bun run sync`
