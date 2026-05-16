## Context

O banco `finance.db` (SQLite, `bun:sqlite`) já armazena 6 tabelas de dados brutos sincronizados da Pluggy: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `identities`. O schema é inicializado automaticamente no construtor de `BunSQLiteAdapter` via `schema.sql`.

O dashboard financeiro em `meu.pluggy.ai/overview` exibe totais pré-computados que correspondem a 4 agregações distintas sobre essas tabelas. Atualmente não existe nenhuma camada de agregação no banco — cada consumidor (futuro MCP tool, scripts de análise) precisaria reimplementar a mesma lógica de GROUP BY e filtros.

**Valores de referência (screenshot 2026-05-11):**
| Métrica | Valor |
|---|---|
| Saldo total contas bancárias | R$ 2.610,44 |
| Fatura total cartões | R$ 17.574,60 |
| Limite total cartões | R$ 47.680,00 |
| % utilização cartões | 37% |
| Patrimônio investimentos | R$ 4.219,04 |
| Evolução do saldo (contas) | R$ 20.185,04 |

## Goals / Non-Goals

**Goals:**
- 4 views SQLite cobrindo os 3 painéis do overview: contas bancárias, cartões de crédito, investimentos
- Arquivos `.sql` isolados em `src/infrastructure/db/views/` — um por view — para facilitar leitura e debug independentes
- Integração no `schema.sql` existente via `CREATE VIEW IF NOT EXISTS` — zero mudança no `BunSQLiteAdapter`
- Testes que abrem o `finance.db` real e verificam os valores contra os números do screenshot

**Non-Goals:**
- `v_balance_evolution`: o gráfico de série temporal requer snapshot histórico de saldos — não existe estrutura de dados para isso ainda; fica para uma change futura
- Nenhuma mudança nas tabelas raw — views são puramente aditivas
- Sem ORM, sem abstração extra — SQL puro

## Decisions

### 1. Arquivos `.sql` separados em `views/`, não inline no `schema.sql`

**Escolha:** Uma pasta `src/infrastructure/db/views/` com um arquivo por view (`v_overview.sql`, `v_bank_summary.sql`, `v_credit_summary.sql`, `v_investment_summary.sql`). O `schema.sql` passa a incluir os 4 blocos `CREATE VIEW IF NOT EXISTS` ao final.

**Rationale:** Cada view tem responsabilidade própria e pode evoluir independentemente. Arquivos separados facilitam diff, revisão e regeneração isolada. No entanto, o `BunSQLiteAdapter` já roda `schema.sql` de uma vez — para manter zero mudança no código TypeScript, o conteúdo das views é incorporado no `schema.sql` na ordem certa (após `CREATE TABLE`). Os arquivos `.sql` em `views/` são a **fonte canônica** da lógica de cada view; o `schema.sql` inclui os mesmos blocos ao final (duplicação intencional para servir dois propósitos: source-of-truth legível + inicialização automática).

**Alternativa descartada:** Ler cada `v_*.sql` separadamente no `initSchema()`. Requereria mudança no `BunSQLiteAdapter` e dependência da ordem de leitura — complexidade desnecessária para o volume atual.

### 2. Semântica de `type` em `accounts`

**Escolha:** Contas bancárias = `type = 'BANK'`. Cartões = `type = 'CREDIT'`.

**Rationale:** Confirmado no mapeamento da revisão 3: os dois subtypes observados são `CHECKING_ACCOUNT`/`SAVINGS_ACCOUNT` (type=BANK) e `CREDIT_CARD` (type=CREDIT). As views filtram por `type` para separar os dois painéis.

### 3. Status de investimento ativo/inativo

**Escolha:** `status = 'ACTIVE'` para ativos, qualquer outro valor (incluindo NULL) para inativos.

**Rationale:** O mapeamento registra `status` como campo presente em investments. O dashboard mostra "21 ativos, 68 inativos" de 89 total — isso corresponde a um filtro por valor de status. SQLite COUNT com FILTER ou CASE WHEN cobre os dois.

### 4. Testes integrados com banco real

**Escolha:** `src/infrastructure/db/views.test.ts` com Bun test runner, abrindo `finance.db` do `DB_PATH` env (fallback `./finance.db`). Cada teste verifica um valor numérico da view contra a constante extraída do screenshot.

**Rationale:** Views SQLite são puramente declarativas — o único teste útil é verificar que a query produz o resultado correto contra dados reais. Mock de banco seria contraproducente aqui. Os valores hardcoded no teste funcionam como "golden values" — se o próximo sync trouxer dados diferentes, os testes falham e sinalizam drift esperado.

**Alternativa descartada:** Testes unitários com banco em memória populado com fixtures. Mais trabalhoso de manter, menor confiança — os fixtures divergiriam dos dados reais ao longo do tempo.

## Risks / Trade-offs

**[Golden values ficam desatualizados após novo sync]** → Aceito. Os testes documentam o estado em 2026-05-11. Quando os dados mudarem, os testes devem ser atualizados conscientemente — isso é feature, não bug. Usar comentário `// snapshot: 2026-05-11` no código.

**[Duplicação SQL entre `views/*.sql` e `schema.sql`]** → Mitigação: uma das duas é a fonte canônica (os arquivos em `views/`) e o `schema.sql` é derivado. Documentar isso com comentário no `schema.sql`.

**[`type` de account pode ter outros valores além de BANK/CREDIT]** → Baixo risco: mapeamento confirma apenas esses dois no proxy consumidor. View usa `WHERE type = 'BANK'` — se um novo tipo aparecer, não vai contaminar os totais erroneamente.

## Open Questions

- O valor R$ 20.185,04 ("Evolução do Saldo") é `SUM(balance) WHERE type IN ('BANK', 'CREDIT')`? Parece ser `2.610,44 + 17.574,60 = 20.185,04` — sim, é a soma de contas bancárias + faturas de cartão. Confirmar na `v_overview` que esse campo bate.
