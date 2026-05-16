## Context

A camada ouro é a interface analítica final — o que os agentes LLM leem via MCP tools. Precisa ser simples de entender, com nomes em português e pré-agregada nas dimensões mais comuns. Optamos por views regulares (não materialized) para manter zero manutenção de refresh.

**Trade-off principal**: views regulares recalculam a cada query. Para 3.000 transações é instantâneo (<10ms). Se crescer para 100.000+ linhas, pode valer migrar para materialized views — mas não é necessário agora.

## Goals / Non-Goals

**Goals:**
- Views gold que respondem as perguntas financeiras mais comuns da família
- Nomes e labels em português (consumidos por LLM)
- Agregação por mês como granularidade principal
- Drill-down possível via filtros nas views

**Non-Goals:**
- Não criar materialized views
- Não criar cubos para cenários hipotéticos (projeções, orçamento) — outra change
- Não expor dados individuais (isso é papel do silver)

## Decisions

**D1: Views regulares, não materialized**
Para o volume atual (3K transações), views regulares são suficientes e têm zero overhead de manutenção. Alternativa: materialized views com REFRESH no sync — mais complexidade desnecessária agora.

**D2: Granularidade mensal como default dos cubos**
Perguntas financeiras familiares são quase sempre "mês a mês". Cubos com `year, month` como primary grain. Drill-down possível via `date_day` no silver.

**D3: `cube_patrimonio` usa saldo atual das contas (snapshot), não histórico**
`accounts.balance` da Pluggy é o saldo atual. Para histórico de patrimônio precisaríamos de snapshotting ao longo do tempo — fora do escopo. O cubo mostra "onde estamos agora".

**D4: Cubo de cashflow usa `f_fluxo_caixa`, não `f_transacoes`**
Garante que transferências internas não distorcem o cashflow. Receita e despesa são `SUM` separados com CASE para facilitar comparação lado a lado.

## Risks / Trade-offs

- **Views sobre views** → cadeia de 3 níveis (bronze → silver → gold). Em PostgreSQL isso é otimizado pelo planner. Aceitável para o volume atual.
- **`cube_patrimonio` sem histórico** → snapshot atual. Para ver evolução do patrimônio ao longo do tempo, precisaria de change separada de snapshotting.
