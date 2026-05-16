## Why

`cube_compromissos_ativos` mostra o valor total restante de cada parcelamento ("Smart TV: R$ 700 restantes"), mas não distribui isso no tempo. Você não sabe se esses R$ 700 caem todos em junho ou distribuídos até dezembro. Com `generate_series`, podemos projetar cada parcela futura como uma linha com mês de vencimento — criando um calendário real de compromissos.

## What Changes

- Cria view `f_parcelas_futuras` em `silver-facts.sql` usando `generate_series`
  - Ponto de partida: transações em `f_parcelas` com `installments_remaining > 0`
  - Para cada compra parcelada em aberto, gera uma linha por parcela futura com:
    - `projected_month`: data aproximada de vencimento (`purchase_day + installment_number * 30 days`)
    - `installment_amount`: `amount` (valor de cada parcela — igual para todas)
    - `installment_seq`: número da parcela projetada (N+1, N+2, ...)
    - `total_installments`, `installments_remaining`, `description`, `owner_normalized`, `category_pt`

## Capabilities

### New Capabilities

- `silver-parcelas-projecao`: Visão temporal de quanto cada parcelamento vai custar nos próximos meses — insumo para previsão de cashflow e alertas de concentração de vencimentos

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Apenas SQL — nova view em `silver-facts.sql` sobre `f_parcelas` (que já existe)
- `generate_series` é nativo do PostgreSQL — sem dependências novas
- Precisão do mês projetado é aproximada (~30 dias/parcela); pode divergir 1-2 dias do faturamento real do cartão
- Nenhuma mudança em TypeScript
- Esta view é insumo para `gold-cashflow-forecast` (change separada)
