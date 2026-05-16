## Context

O sync do Pluggy faz upsert por `id` da transação. O problema é que o Pluggy às vezes gera dois IDs diferentes para o mesmo evento financeiro — um com status PENDING e outro com status POSTED, com timestamps diferentes no mesmo dia. O upsert `ON CONFLICT (id)` não detecta isso. Ambos chegam como POSTED no banco.

Fingerprint de dedup: `(account_id, date::date, ABS(amount), type)` — suficientemente específico para evitar falsos positivos (dois pagamentos iguais no mesmo dia são raros e seriam detectados manualmente).

## Goals / Non-Goals

**Goals:**
- Eliminar duplicatas na camada silver sem alterar bronze
- Manter o registro mais recente (maior `updated_at`) de cada fingerprint
- Solução transparente: todos os cubes downstream limpam automaticamente

**Non-Goals:**
- Não alterar a tabela `transactions` (bronze imutável)
- Não deduplicar PENDING vs POSTED com IDs iguais (já funciona via upsert)
- Não tratar duplicatas em `investment_transactions`

## Decisions

**D1 — CTE `deduplicated` dentro do enrich()**

O `enrichTransactions.enrich()` já faz TRUNCATE + INSERT. Adicionar uma CTE no início do INSERT que filtra duplicatas:

```sql
WITH deduplicated AS (
  SELECT DISTINCT ON (account_id, date::date, ABS(amount), type)
    *
  FROM transactions
  ORDER BY account_id, date::date, ABS(amount), type, updated_at DESC
)
```

O `INSERT INTO transactions_enriched ... SELECT ... FROM deduplicated t ...` substitui `FROM transactions t`.

**D2 — Critério de desempate: `updated_at DESC`**

Mantém o registro que o Pluggy atualizou por último — geralmente o POSTED final.

**D3 — Não criar índice extra agora**

A dedup roda apenas no `enrich()` (chamado pelo sync, não em queries de leitura). Performance aceitável.

## Risks / Trade-offs

- **Falso positivo**: dois pagamentos iguais no mesmo dia na mesma conta → um seria descartado. Risco baixo em finanças pessoais; pode ser monitorado por log do enrich (comparar COUNT antes/depois).
- **Scope**: corrige apenas o que entra no silver; duplicatas em bronze permanecem para auditoria.
