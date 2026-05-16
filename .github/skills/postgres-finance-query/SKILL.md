---
name: postgres-finance-query
description: "Query the finance postgres database. Use when: investigating data correctness, validating dashboard numbers, debugging discrepancies, exploring SQL views, checking tenant isolation, or auditing transactions for a specific user (Wilson or João)."
argument-hint: "Describe what you want to investigate (e.g.: 'receitas de Wilson em maio 2026')"
---

# Postgres Finance — Guia de Consultas

## Quando usar
- Validar números exibidos na UI
- Debugar discrepâncias entre views e a API
- Checar isolamento de tenant
- Investigar transações de um período específico
- Entender como as views (`cube_*`, `f_*`, `kpi_*`) calculam os dados

## Passo 0 — Perguntar o tenant antes de qualquer consulta

**Sempre perguntar qual usuário antes de executar qualquer query**, exceto quando o contexto da conversa já deixou claro.

Use a ferramenta `vscode_askQuestions` com:

```
Qual usuário você quer investigar?
Options:
  - Wilson (025179ad-9cd6-4213-bc2c-d1ccc65da6f8)
  - João (1af6e706-796c-469c-831c-dda73cdcbbec)
  - Ambos (comparar os dois)
```

Guarde o `tenant_id` escolhido e use em todas as queries da sessão como `SET app.tenant_id = '<id>'`.

---

## Acesso ao banco

O banco roda no container `mcp-finance-postgres-1`. Não há `psql` instalado localmente — usar via `docker exec`.

```bash
# Consulta simples como superuser (sem RLS aplicado aos dados)
docker exec mcp-finance-postgres-1 psql -U postgres -d finance -c "<SQL>"
```

> ⚠️ O superuser (`postgres`) **ignora RLS** nas tabelas sem `FORCE ROW LEVEL SECURITY`. Sempre conferir se a tabela tem FORCE ROW SECURITY ativo antes de confiar nos resultados.

### Usuário correto para simular a API

A API usa o usuário `finance` (não superuser, sem bypass RLS). Para resultados fiéis ao que o front exibe:

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '<tenant_id>';
<SQL>
"
```

---

## Tenants disponíveis

| Usuário | tenant_id | email |
|---------|-----------|-------|
| Wilson | `025179ad-9cd6-4213-bc2c-d1ccc65da6f8` | wfelipepluggy@gmail.com |
| João | `1af6e706-796c-469c-831c-dda73cdcbbec` | joaowictor756@gmail.com |

Buscar sempre via:
```sql
SELECT id, name, email FROM tenants ORDER BY name;
```

---

## Isolamento de tenant (RLS)

As tabelas críticas têm RLS + FORCE ROW LEVEL SECURITY:

```sql
-- Checar se tabela tem FORCE RLS
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('transactions_enriched', 'accounts', 'investments', 'transactions');
```

| Tabela | RLS | FORCE RLS |
|--------|-----|-----------|
| `transactions_enriched` | ✓ | ✓ |
| `accounts` | ✓ | ✓ |
| `investments` | ✓ | ✓ |
| `transactions` | ✓ | ✓ |

A policy em todas é:
```sql
(tenant_id = current_setting('app.tenant_id', true)::uuid)
```

### Regra de ouro

**Sempre use o usuário `finance` + `SET app.tenant_id`** para consultas que devem refletir o que o usuário vê. Usar `postgres` sem SET retorna dados de todos os tenants misturados.

---

## Views disponíveis

Para o schema completo (colunas, tipos, descrição) de cada view, consulte [references/views-schema.md](./references/views-schema.md).

### Cubo (agregações mensais — filtradas por RLS)

| View | O que retorna |
|------|---------------|
| `cube_cashflow_mensal` | Receitas, despesas, saldo por mês |
| `cube_gastos_categoria_mensal` | Gastos por subcategoria/mês |
| `cube_gastos_grupo_mensal` | Gastos por grupo/mês |
| `cube_gastos_mensais` | Gastos com descrição da transação |
| `cube_investimentos_mensal` | Movimentações de investimentos |
| `cube_patrimonio` | Saldo atual por conta |
| `cube_cashflow_projetado` | Projeção de fluxo futuro |
| `cube_compromissos_ativos` | Parcelas de cartão em aberto |
| `cube_tendencias` | Gastos recorrentes detectados |

### Fato (transações base — filtradas por RLS)

| View | O que retorna |
|------|---------------|
| `f_transacoes` | Todas as transações do tenant |
| `f_fluxo_caixa` | Apenas `is_real_cashflow = true` |
| `f_parcelas` | Transações parceladas |
| `f_parcelas_futuras` | Parcelas ainda não cobradas (projeções) |

### KPI (filtradas por RLS)

| View | O que retorna |
|------|---------------|
| `kpi_runway_imediato` | Fôlego: conta corrente ÷ média 90d |
| `kpi_runway_total` | Fôlego: (conta + investimentos) ÷ média 90d |
| `kpi_cash_runway` | Versão simplificada sem separar investimentos |

### Dimensões (sem RLS — dados de referência)

| View | O que retorna |
|------|---------------|
| `d_categoria` | Categorias Pluggy → português |
| `d_conta` | Metadados de contas (sem saldo) |
| `d_data` | Calendário para joins temporais |

---

## Queries prontas

### Dashboard — Resultado do mês

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '025179ad-9cd6-4213-bc2c-d1ccc65da6f8';
SELECT year, month, total_receitas, total_despesas, saldo_liquido,
       total_receitas_operacionais, total_emprestimos
FROM cube_cashflow_mensal
WHERE year = 2026 AND month = 5;"
```

### Fôlego imediato e total

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '025179ad-9cd6-4213-bc2c-d1ccc65da6f8';
SELECT saldo_liquido, media_saidas_90d, runway_imediato_meses,
       ROUND(runway_imediato_meses * 30) as dias_imediato
FROM kpi_runway_imediato;

SELECT saldo_liquido, saldo_investimentos, media_saidas_90d, runway_total_meses,
       ROUND(runway_total_meses * 30) as dias_total
FROM kpi_runway_total;"
```

### Transações reais do mês (como a API usa)

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '025179ad-9cd6-4213-bc2c-d1ccc65da6f8';
SELECT transaction_kind, COUNT(*) as qtd, SUM(ABS(amount_signed)) as total
FROM f_fluxo_caixa
WHERE date_day >= '2026-05-01' AND date_day < '2026-06-01'
GROUP BY transaction_kind
ORDER BY transaction_kind;"
```

### Todas as transações (com INVEST e TRANSFER)

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '025179ad-9cd6-4213-bc2c-d1ccc65da6f8';
SELECT transaction_kind, is_real_cashflow, COUNT(*) as qtd, SUM(ABS(amount_signed)) as total
FROM f_transacoes
WHERE date_day >= '2026-05-01' AND date_day < '2026-06-01'
GROUP BY transaction_kind, is_real_cashflow
ORDER BY is_real_cashflow DESC, transaction_kind;"
```

### Ver digest de IA de um mês

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '025179ad-9cd6-4213-bc2c-d1ccc65da6f8';
SELECT year, month, cashflow_real, debt_inflows, debt_payments,
       narrative_pt IS NOT NULL as has_narrative, flags, digest_at
FROM ai_monthly_digest
WHERE year = 2026 AND month = 5;"
```

---

## Como a UI calcula "Resultado do Mês"

O componente `Resumo.tsx` usa a seguinte lógica de prioridade:

```
1. Se existe digest de IA → usa digest.cashflow_real
2. Senão → usa cashflow.saldo_liquido da view cube_cashflow_mensal
```

E para **Receitas**, usa `total_receitas_operacionais` quando disponível (exclui empréstimos), senão `total_receitas`.

---

## Inspecionar uma view

```bash
# Ver definição SQL de qualquer view
docker exec mcp-finance-postgres-1 psql -U postgres -d finance -c "
SELECT pg_get_viewdef('<nome_da_view>', true);"

# Ver colunas de uma tabela/view
docker exec mcp-finance-postgres-1 psql -U postgres -d finance -c "\d <nome>"

# Ver policies RLS de uma tabela
docker exec mcp-finance-postgres-1 psql -U postgres -d finance -c "
SELECT polname, polcmd, pg_get_expr(polqual, polrelid)
FROM pg_policy
WHERE polrelid = '<tabela>'::regclass;"
```

---

## Checklist de validação de dados

Ao validar um número da UI:

1. **Identificar o endpoint** — ver `client/src/api/client.ts` + `src/application/web/routes/`
2. **Traçar até a view** — ver `BunPgAdapter.ts` para ver qual query é executada
3. **Consultar como `finance`** + `SET app.tenant_id` (não como `postgres`)
4. **Comparar com a tabela base** — `transactions_enriched` com `tenant_id` explícito
5. **Checar o digest de IA** — se existe, pode sobrescrever valores da view
