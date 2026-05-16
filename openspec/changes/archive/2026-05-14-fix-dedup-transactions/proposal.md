## Why

O Pluggy às vezes registra a mesma transação com dois IDs distintos — o evento "pendente" (PENDING) e o evento liquidado (POSTED) chegam como registros separados quando o `operation_type` difere (ex: `"Pagamento recebido"` + `"PAGTO ANTECIPADO PIX"` para o mesmo valor no mesmo dia). O upsert atual protege contra atualização de status do mesmo ID, mas não detecta pares com IDs diferentes.

Impacto medido no banco:
- Mar/2026: 4 pares duplicados → R$ 16.180 inflados em receitas
- Fev/2026: 6 pares → R$ 3.550 inflados
- Jan/2026: 3 pares → R$ 3.660 inflados

Esses duplicados inflatam `total_receitas` no `cube_cashflow_mensal` e distorcem o saldo líquido exibido no app.

## What Changes

Adicionar uma etapa de deduplicação na view `transactions_enriched`: antes de calcular `transaction_kind`, eliminar registros que possuam o mesmo `(account_id, date::date, ABS(amount), type)` com status `POSTED`, mantendo apenas o registro com `updated_at` mais recente.

A deduplicação ocorre como CTE dentro do `enrichTransactions.enrich()` — não altera a tabela bronze `transactions`, apenas filtra na projeção prata.

## Capabilities

### New Capabilities
- `dedup-transactions`: Deduplicação de transações duplicadas por fingerprint `(account_id, date_day, abs_amount, type)` na camada silver, mantendo o registro mais recente.

### Modified Capabilities
- `transactions-bronze`: A view `transactions_enriched` passa a usar subquery deduplicada como base, em vez de `FROM transactions` diretamente.

## Impact

- `BunPgAdapter.enrichTransactions.enrich()`: o INSERT INTO transactions_enriched usa nova CTE de dedup
- `transactions_enriched`: dados mais limpos, menos linhas em meses com duplicatas do Pluggy
- Todos os cubes downstream (cashflow, gastos, compromissos) herdam dados corrigidos
- Nenhuma alteração na tabela bronze `transactions`
