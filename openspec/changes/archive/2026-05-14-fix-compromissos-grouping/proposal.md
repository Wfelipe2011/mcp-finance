## Why

O `cube_compromissos_ativos` agrupa parcelas por `(description, DATE(cc_purchase_date), amount, account_id)`. O problema: cada parcela de um parcelamento tem uma **descrição diferente** do Pluggy — `"FATURA PARCELAPARC01/10"`, `"FATURA PARCELAPARC02/10"`, etc — e um **valor ligeiramente diferente** (variação de centavos no IOF). Isso faz com que cada parcela recebida seja tratada como uma compra nova, gerando 193 "compromissos" separados onde na prática são ≈40-60 compras distintas.

Além disso, a pergunta do usuário é: **"quanto ainda tenho a pagar de parcelas no cartão?"** — e a view atual responde de forma fragmentada, difícil de interpretar.

## What Changes

Redesenhar o grouping do `cube_compromissos_ativos` usando como chave de agrupamento:
- `(account_id, cc_total_installments, DATE_TRUNC('month', cc_purchase_date), ROUND(amount_canonical, 0))`

Onde `amount_canonical` é o valor da 1ª parcela (anchor). Isso agrupa todas as parcelas da mesma compra como uma única linha de compromisso, mostrando o número da parcela mais recente paga e o total restante corretamente.

Adicionalmente, expor na API a lista de compromissos **compactada**: uma linha por compra parcelada com `parcela_atual/total`, `valor_parcela`, `total_restante`.

## Capabilities

### New Capabilities
- `compromissos-grouping`: Agrupamento correto de parcelas de cartão por compra, não por evento de cobrança.

### Modified Capabilities
- `cashflow-views`: `cube_compromissos_ativos` reescrito com novo GROUP BY

## Impact

- `gold-cubes.sql`: VIEW `cube_compromissos_ativos` reescrita
- `BunPgAdapter.ts`: `getCompromissosAtivos()` sem alteração (schema de retorno compatível)
- `ProximoMes.tsx`: `CompromissosLista` exibe dados mais compactos e legíveis
- Número de linhas cai de ~193 para ~40-60
