## Why

Os cubos analíticos atuais (`cube_gastos_mensais`, `cube_cashflow_mensal`) tratam todas as parcelas de cartão como gastos novos do mês em que caem, tornando impossível distinguir comportamento novo de compromisso já assumido. Com R$110k em parcelamentos futuros invisíveis ao modelo, a pergunta "o cartão está fora de controle?" não tem resposta — os dados existem no bronze mas nunca chegam ao silver/gold.

## What Changes

- **Nova view silver** `f_parcelas`: expõe os campos `cc_installment_number`, `cc_total_installments`, `cc_purchase_date` (já presentes em `transactions_enriched`) com colunas derivadas como `is_installment`, `is_first_installment`, `installments_remaining`.
- **Novo cubo gold** `cube_compromissos_ativos`: agrega parcelamentos ativos por compra original (agrupando por `description + DATE(cc_purchase_date) + amount + account`), calculando o passivo futuro real por cartão/categoria.
- **Novo cubo gold** `cube_gastos_novos`: gastos do mês filtrados pela ótica da decisão — apenas primeiras parcelas (`cc_installment_number = 1`) e compras à vista (`cc_total_installments IS NULL OR = 1`).
- **Nenhuma alteração** no bronze, sync, ou nas views/cubos existentes — é adição pura.

## Capabilities

### New Capabilities

- `silver-f-parcelas`: View silver que projeta campos de parcelamento do bronze com colunas derivadas para classificação e cálculo de restante.
- `gold-cube-compromissos`: Cubo gold de compromissos futuros por compra original — passivo real em parcelamentos ativos, agrupado por cartão e categoria.
- `gold-cube-gastos-novos`: Cubo gold de gastos pela ótica da decisão — apenas compras novas (1ª parcela ou à vista), separando comportamento de rastro.

### Modified Capabilities

*(nenhuma — mudança é puramente aditiva)*

## Impact

- **Arquivos modificados**: `src/infrastructure/db/silver-facts.sql`, `src/infrastructure/db/gold-cubes.sql`
- **Nenhuma tabela criada**: todas as adições são views (`CREATE OR REPLACE VIEW`)
- **Sem breaking changes**: views e cubos existentes permanecem intactos
- **Dependência de dados**: requer `cc_installment_number` e `cc_total_installments` preenchidos — cobertura atual é ~13% das transações (apenas cartão de crédito, o esperado)
- **Chave de agrupamento**: `(description, DATE(cc_purchase_date), amount, account_id)` — necessário truncar timestamp para evitar overcounting (Pluggy emite timestamps únicos por parcela)
