## Context

O bronze layer (`transactions`) armazena campos de parcelamento do Pluggy (`cc_installment_number`, `cc_total_installments`, `cc_purchase_date`) em todas as transações de cartão de crédito. Esses campos são preservados em `transactions_enriched` mas descartados silenciosamente pelas views silver (`f_transacoes`), tornando-os invisíveis nos cubos gold.

Estado atual:
- `f_transacoes`: 24 colunas, nenhuma de parcelamento
- `cube_gastos_mensais`: agrega `EXPENSE` de fluxo real — mistura compras novas + rastro de parcelamentos antigos
- `cube_cashflow_mensal`: idem — `is_real_cashflow = true` para toda parcela independente de número
- Cobertura dos campos estruturados: ~13% das transações totais (exclusivo de cartão de crédito — esperado)
- Anomalia encontrada: Pluggy emite `cc_purchase_date` com timestamps únicos por parcela (mesmo produto, mesma compra, timestamps distintos por milissegundos)

## Goals / Non-Goals

**Goals:**
- Expor campos de parcelamento no silver com colunas derivadas para classificação
- Criar cubo de compromissos futuros com cálculo correto do passivo (sem overcounting)
- Criar cubo de gastos pela ótica da decisão (apenas compras novas)
- Manter compatibilidade total com views/cubos existentes

**Non-Goals:**
- Alterar `transactions_enriched` ou a lógica de `is_real_cashflow`
- Modificar o pipeline de sync
- Criar tabelas físicas — somente views
- Inferir parcelamentos de transações sem campos estruturados (ex: `Mp *Kokeshi 1/2` sem `cc_total_installments`)
- Projetar parcelas futuras ainda não lançadas (apenas o que já chegou do Pluggy)

## Decisions

### D1 — View silver `f_parcelas` em vez de extender `f_transacoes`

**Decisão**: nova view separada, não modificar `f_transacoes`.

**Alternativas consideradas**:
- Adicionar colunas de parcelamento direto em `f_transacoes` — descartado: mudaria o contrato de todas as views que dependem dela (cubos existentes), risco desnecessário para mudança aditiva.
- View `f_transacoes_completa` como extensão — descartado: nomenclatura ambígua; preferimos separação de concerns clara.

**Rationale**: `f_parcelas` é um subset (`WHERE cc_total_installments IS NOT NULL`) com colunas extras derivadas. Qualquer query que precise de parcelamento busca explicitamente essa view.

### D2 — Chave de agrupamento usa `DATE(cc_purchase_date)` não o timestamp completo

**Decisão**: truncar `cc_purchase_date` para dia na chave de agrupamento do cubo de compromissos.

**Alternativas consideradas**:
- Usar timestamp completo — descartado: causa overcounting confirmado em produção. A mesma compra física (ex: AMAZONMKTPLC*MDMOVEISL 12x R$144,75) aparece com 10+ timestamps diferentes, um por parcela, inflando o VISA INFINITE de R$9k para R$70k.
- Usar `cc_bill_id` — descartado: nem sempre preenchido e não é garantia de unicidade por compra.

**Rationale**: `(description, DATE(cc_purchase_date), amount, account_id)` é a chave mínima que identifica uma compra original de forma unívoca nos dados reais observados.

### D3 — `cube_compromissos_ativos` usa MAX(installment_number) por compra

**Decisão**: calcular parcelas restantes como `MAX(total) - MAX(installment_number)` por grupo de compra.

**Rationale**: O Pluggy sincroniza parcelas incrementalmente — a última parcela registrada é a mais recente disponível. `MAX(installment_number)` representa "até onde sincronizamos" e `MAX(total) - MAX(installment_number)` é o que ainda falta cair. Isso é conservador e correto: não projeta parcelas além do que o banco já conhece.

### D4 — `cube_gastos_novos` usa `cc_installment_number = 1 OR cc_total_installments IS NULL`

**Decisão**: filtrar por primeira parcela ou compra à vista para representar decisão de compra.

**Alternativas consideradas**:
- Usar `cc_total_installments = 1` para à vista — descartado: nem toda compra à vista tem o campo preenchido (cobertura incompleta). `IS NULL` é mais abrangente.
- Somar valor total da compra na 1ª parcela — descartado: prefere-se preservar o `amount` original (valor da parcela) para consistência com os outros cubos; o total da compra pode ser derivado via `amount * cc_total_installments` quando necessário.

## Risks / Trade-offs

- **Parcelas sem campos estruturados** → não entram no `f_parcelas` nem nos novos cubos. São ~87% das transações (debito, banco, à vista em cartão) — comportamento correto e documentado. Casos como `Mp *Kokeshi 1/2` (única anomalia encontrada) ficam fora, mas são raros e isolados.

- **Passivo subestimado** → `cube_compromissos_ativos` só vê parcelas já sincronizadas. Parcelas futuras que o Pluggy ainda não entregou (ex: meses 8-12 de uma compra 12x feita ontem) não aparecem até o próximo sync que as trouxer. Isso é uma limitação do dado de origem, não do modelo.

- **Duplicação de análise** → o `cube_gastos_mensais` existente e o `cube_gastos_novos` novo medem coisas diferentes. Um analista desavisado pode confundir os dois. Mitigação: nomenclatura clara e comentários no SQL documentando a semântica de cada cubo.

- **PIC PAY parcelamento de fatura** → `FATURA PARCELAPARC01/10` é um parcelamento de fatura (não uma compra), mas aparece com os campos estruturados preenchidos. Vai entrar nos cubos de parcelamento como qualquer outra compra, o que pode distorcer a análise de categoria. Mitigação: futuramente pode-se excluir via `description ILIKE 'FATURA PARCELA%'`, mas não é escopo desta mudança.

## Migration Plan

1. Aplicar as novas views via `CREATE OR REPLACE VIEW` — idempotente, sem downtime
2. Verificar contagem de linhas em `f_parcelas` vs. total de `transactions` com campos preenchidos
3. Validar `cube_compromissos_ativos` contra query manual de passivo (resultado esperado: ~R$110k total)
4. Verificar que `cube_gastos_mensais` e `cube_cashflow_mensal` existentes retornam os mesmos valores de antes

**Rollback**: `DROP VIEW` nas três novas views. Zero impacto nas views existentes.
