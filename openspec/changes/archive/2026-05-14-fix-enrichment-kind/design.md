## Context

O CTE `kind` no `enrich()` avalia `transaction_kind` em ordem de prioridade via CASE. Atualmente as cláusulas são:
1. RESGATE/RENDIMENTO → INVEST
2. CREDIT + payment_data.accountNumber próprio → TRANSFER
3. DEBIT + payment_data.accountNumber próprio → TRANSFER
4. DEBIT + bank account + descrição de pagamento de fatura → TRANSFER
5. CREDIT + credit account + pagamento de fatura → TRANSFER
6. DEBIT → EXPENSE
7. else → INCOME

Os aportes em investimentos (Digio, Cofrinho, etc.) chegam como `DEBIT` sem operation_type específico e sem payment_data resolvível → caem no caso 6 → EXPENSE.

As transferências próprias por PIX onde o Pluggy não preenche `receiver.accountNumber` → caem no caso 6 → EXPENSE.

A solução é adicionar duas cláusulas **antes** do fallback `DEBIT → EXPENSE`:

## Goals / Non-Goals

**Goals:**
- Reclassificar aportes em investimentos como `INVEST` usando categoria do Pluggy
- Reclassificar transferências entre contas próprias como `TRANSFER` usando categoria do Pluggy
- Preservar a ordem de prioridade existente (regras mais específicas têm precedência)

**Non-Goals:**
- Não alterar como INCOME é classificado
- Não remover as regras baseadas em `operation_type` e `payment_data` (continuam com prioridade mais alta)
- Não tratar investimentos do lado CREDIT (resgates já funcionam)

## Decisions

**D1 — Ordem dos WHEN no CASE**

Novos WHEN inseridos imediatamente antes de `WHEN t.type = 'DEBIT' THEN 'EXPENSE'`:

```sql
WHEN t.type = 'DEBIT'
  AND cg.group_id IN (
    SELECT group_id FROM category_groups WHERE name_pt = 'Transferência entre Próprias Contas'
  )
  THEN 'TRANSFER'
WHEN t.type = 'DEBIT'
  AND cg.group_id IN (
    SELECT group_id FROM category_groups WHERE name_pt = 'Investimentos'
  )
  THEN 'INVEST'
```

**D2 — Usar `category_groups` em vez de texto hardcoded**

A coluna `LEFT(t.category_id, 2)` já está disponível na query; o JOIN com `category_groups` já existe. Usar `cg.group_id` da subconsulta evita hardcoding de strings de categoria.

**D3 — Alternativa rejeitada: tabela `category_overrides`**

Poderíamos usar `category_overrides` para reclassificar, mas o problema é de `transaction_kind`, não de categoria. O override de categoria não altera `transaction_kind`. A solução correta é no classificador.

## Risks / Trade-offs

- **Falso positivo INVEST**: se o Pluggy categorizar erroneamente uma despesa como "Investimentos" (ex: taxa administrativa de fundo), ela viraria INVEST. Risco baixo — monitorar em revisão pós-apply.
- **Falso positivo TRANSFER**: se uma transferência para terceiro for categorizada como "Transferência entre Próprias Contas" pelo Pluggy, seria excluída das despesas. Risco muito baixo — o Pluggy é preciso nessa categoria.
