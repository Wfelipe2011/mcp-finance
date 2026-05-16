## Why

O banco SQLite já contém todos os dados financeiros sincronizados (contas, transações, investimentos, identidades), mas não há nenhuma camada de agregação: cada consulta precisa recalcular totais, percentuais e agrupamentos do zero. Isso torna a futura camada MCP dependente de lógica de agregação no código TypeScript — aumenta o acoplamento e reduz a reutilizabilidade das queries.

## What Changes

- Adicionar pasta `src/infrastructure/db/views/` com arquivos `.sql` de views nomeados `v_*.sql`
- Criar 4 views SQLite que representam as visões consolidadas do dashboard financeiro:
  - `v_overview`: totais de topo (saldo bancário total, fatura total de cartões, limite total, % utilização, patrimônio em investimentos)
  - `v_bank_summary`: saldo por banco/instituição com percentual do total
  - `v_credit_summary`: fatura e limite por cartão de crédito com % de utilização
  - `v_investment_summary`: patrimônio agrupado por tipo de investimento (Renda Fixa, Ações, etc.) com contagem de ativos/inativos
- Registrar as views no `schema.sql` para que sejam criadas automaticamente na inicialização do banco
- Adicionar testes com valores de referência extraídos do screenshot atual do dashboard (R$ 2.610,44 / R$ 17.574,60 / R$ 4.219,04)

## Capabilities

### New Capabilities

- `financial-views`: Views SQLite que expõem dados financeiros pré-agregados para consumo pelo MCP ou por qualquer query direta ao banco

### Modified Capabilities

- `db-schema`: O schema existente passa a incluir `CREATE VIEW IF NOT EXISTS` para as 4 views — requisito de inicialização muda

## Impact

- `src/infrastructure/db/schema.sql`: adição dos `CREATE VIEW IF NOT EXISTS` das 4 views
- `src/infrastructure/db/views/`: nova pasta com `v_overview.sql`, `v_bank_summary.sql`, `v_credit_summary.sql`, `v_investment_summary.sql`
- Novos testes em `src/infrastructure/db/views.test.ts` que abrem o banco real (`finance.db`) e validam os resultados contra valores conhecidos do dashboard
- Sem breaking changes — nenhum código existente é modificado, views são aditivas
