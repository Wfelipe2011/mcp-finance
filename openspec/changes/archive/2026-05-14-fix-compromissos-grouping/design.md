## Context

Cada cobrança mensal de parcela chega do Pluggy como uma transação separada com `cc_installment_number` incrementando. As parcelas de uma mesma compra compartilham `account_id`, `cc_total_installments` e `cc_purchase_date` (data original da compra), mas diferem em `description` (inclui `PARC01/10`, `PARC02/10`) e `amount` (variação de centavos).

O `cube_compromissos_ativos` atual usa `(description, DATE(cc_purchase_date), amount, account_id)` como GROUP BY — quebrando cada parcela como compra distinta.

A abordagem correta: agrupar por `(account_id, cc_total_installments, DATE_TRUNC('month', cc_purchase_date))` e usar `MAX(cc_installment_number)` para saber a parcela atual, e `MIN(amount)` ou o amount da 1ª parcela como valor canonical.

## Goals / Non-Goals

**Goals:**
- Uma linha por compra parcelada (não por cobrança mensal)
- Mostrar corretamente `parcela_atual / total_parcelas` e `valor_restante`
- Manter `HAVING MAX(cc_installment_number) < MAX(cc_total_installments)` para filtrar quitados

**Non-Goals:**
- Não alterar `f_parcelas_futuras` (projeção temporal, usa lógica diferente)
- Não exibir histórico de parcelas pagas
- Não tratar parcelamentos sem `cc_purchase_date` (raridade)

## Decisions

**D1 — Chave de grouping: `(account_id, cc_total_installments, DATE_TRUNC('month', cc_purchase_date))`**

Remove `description` e `amount` do GROUP BY. Usa `DATE_TRUNC('month', ...)` em vez de `DATE(...)` para tolerar pequenas variações de timestamp intradiário do Pluggy.

**D2 — Description via MIN() para representar a compra**

Usar `MIN(description)` ou a descrição sem o sufixo de parcela via `regexp_replace(description, 'PARC\d+/\d+', '')` para um nome limpo.

**D3 — Valor canonical via MIN(amount) da primeira parcela**

O amount da 1ª parcela (`WHERE cc_installment_number = 1`) é o mais representativo. Se indisponível (entrada no meio do parcelamento), usar `AVG(amount)`.

**D4 — `compromisso_restante = (total - max_atual) * amount_canonical`**

Formula atual mantida, mas agora com amount_canonical consistente.

## Risks / Trade-offs

- **Compras com exato mesmo mês + total de parcelas na mesma conta**: dois produtos distintos comprados no mesmo mês com mesmo número de parcelas seriam fundidos. Risco muito baixo mas possível. Mitigação futura: incluir `ROUND(MIN(amount), 0)` no GROUP BY.
