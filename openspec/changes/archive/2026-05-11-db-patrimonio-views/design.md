## Context

O banco contém saldo bancário em `accounts` (type='BANK'), fatura de cartão em `accounts` (type='CREDIT') e patrimônio em `investments`. Esses valores já são agregados individualmente pelas views existentes (v_overview). O que falta é a **visão consolidada** e a **dimensão temporal** dos investimentos.

Para renda fixa, o campo `dueDate` indica quando o ativo vence. O banco tem ativos com vencimentos de 3 dias a 2+ anos. O campo `status='ACTIVE'` filtra apenas ativos vivos. A view de maturidade precisa calcular `julianday(dueDate) - julianday('now')` para obter dias restantes.

## Goals / Non-Goals

**Goals:**
- `v_net_worth`: 1 linha com `bankTotal`, `investmentTotal`, `creditTotal` (fatura), e `netWorth = bankTotal + investmentTotal - creditTotal`
- `v_investment_maturity`: 1 linha por investimento ACTIVE com dueDate, mostrando `diasParaVencer` e `bucket` ('≤30d' / '31-90d' / '91-365d' / '>365d')
- Ordenação por `dueDate ASC` na view de maturidade

**Non-Goals:**
- Não consolidar com passivos além de cartão de crédito (empréstimos, financiamentos não estão em tabelas separadas)
- Não calcular rentabilidade ou retorno — apenas patrimônio atual e prazo de vencimento
- Não incluir investimentos sem `dueDate` (fundos de ações, etc.) na view de maturidade

## Decisions

**D1 — `v_net_worth` reutiliza subqueries das views existentes**
As subqueries de `v_overview` já são validadas por testes. `v_net_worth` usa o mesmo padrão (subqueries escalares com COALESCE/ROUND) para consistência. Alternativa: fazer JOIN com v_overview — descartada porque views não podem ser facilmente indexadas e subqueries são equivalentes em SQLite.

**D2 — `diasParaVencer` pode ser negativo**
Investimentos com `dueDate` no passado mas `status='ACTIVE'` (dados desatualizados do banco) terão `diasParaVencer < 0`. A view expõe o valor raw; o bucket para negativos é `'vencido'`. O modelo interpreta e alerta o usuário.

**D3 — `v_investment_maturity` filtra por `dueDate IS NOT NULL AND status = 'ACTIVE'`**
Investimentos de renda variável (fundos, ações) frequentemente não têm `dueDate`. Incluí-los na view de maturidade sem data de vencimento seria confuso para o modelo. Uma view separada (fora do escopo) poderia lidar com eles.

**D4 — Bucket como coluna TEXT calculada com CASE WHEN**
SQLite não tem tipos ENUM. O bucket é calculado inline: `CASE WHEN diasParaVencer <= 0 THEN 'vencido' WHEN diasParaVencer <= 30 THEN '≤30d' ...`. Permite ao MCP filtrar por bucket via SQL.

## Risks / Trade-offs

- **[Risco] `creditTotal` inclui faturas já pagas do mês** → O dado vem de `accounts.balance` que é atualizado pelo sync. Se o sync rodou após o pagamento, o saldo correto já está no banco. Se não rodou, a fatura aparece como pendente. Mitigação: o usuário deve rodar `bun run sync` antes de consultar.
- **[Trade-off] `v_net_worth` pode parecer pessimista** → Subtrai fatura total mesmo que parte já tenha sido paga. É conservador e honesto com os dados disponíveis.
- **[Risco] `dueDate` armazenado como ISO 8601 com timezone (`T03:00:00.000Z`)** → `julianday()` do SQLite aceita esse formato corretamente. Validado nos dados reais.
