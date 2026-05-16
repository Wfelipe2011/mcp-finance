## Context

A tabela `transactions_enriched` foi criada pela change `transactions-bronze` com todas as 29 colunas de `transactions` + 3 colunas de enriquecimento. Análise dos dados reais (3.295 linhas) revelou:

- **4 colunas com 0% de preenchimento**: `balance`, `provider_code`, `merchant`, `acquirer_data` — nunca populadas pelo Pluggy neste contexto
- **`payment_data`**: 52% preenchido, mas já processado — seu resultado está em `peer_account_id` e `transaction_kind`. Manter o JSON bruto no bronze é peso sem retorno analítico
- **`cc_card_number`**: 47% preenchido, mas valor mascarado (ex: `****1234`) — não serve para JOIN, não serve para análise
- **`provider_id`**: 100% preenchido, mas é ID interno do Pluggy, sem utilidade analítica
- **`order`**: 100% preenchido, sequência intra-dia técnica (0,1,2...), não é dimensão de análise
- **`created_at`, `updated_at`, `synced_at`**: metadados de integração — úteis na raw, ruído no bronze analítico
- **`owner` (via JOIN com `accounts`)**: fragmentado em 3 grafias para Wilson (`Wilson Felipe da Silva`, `Wilson Felipe Da Silva`, `WILSON FELIPE DA SILVA`), tornando `GROUP BY owner` inútil sem normalização

## Goals / Non-Goals

**Goals:**
- Remover 11 colunas sem valor analítico de `transactions_enriched`
- Adicionar `owner_normalized` como chave de agrupamento por membro da família
- Manter `description_raw` (diferente de `description` em alguns casos — fallback para detecção textual)
- Manter `amount_in_account_currency` (49 transações em USD com valor distinto do `amount`)
- Não alterar `transactions` (tabela raw intacta)

**Non-Goals:**
- Normalização semântica de `owner` (ex: "Wilson"/"Giulia") — `LOWER(TRIM())` técnico é suficiente agora
- Criação de tabela `d_members` separada
- Correção da lacuna de classificação da Regra 5 (pagamentos de fatura escapando — escopo de outra change)
- Migração de dados históricos — TRUNCATE + repopulação no próximo sync é suficiente

## Decisions

### D1: Estratégia de migração — DROP TABLE + CREATE vs ALTER TABLE

**Decisão:** `DROP TABLE transactions_enriched` + `CREATE TABLE` com novo DDL + repopulação via `bun run sync`.

**Alternativa considerada:** `ALTER TABLE` (série de DROP COLUMN + ADD COLUMN). Mais cirúrgico, preserva dados durante a migração.

**Rationale:** A tabela é 100% derivada de `transactions` — recriá-la do zero via sync tem custo zero em dados (não há dado original aqui). O DROP + CREATE é mais simples, sem risco de estado inconsistente entre as migrações de coluna, e o sync completo já testa o novo schema de ponta a ponta.

**Rollback:** DROP TABLE `transactions_enriched`. Sem impacto em `transactions`.

---

### D2: Normalização de `owner_normalized`

**Decisão:** `LOWER(TRIM(a.owner))` computado via JOIN com `accounts` durante o INSERT de enriquecimento.

**Alternativa considerada:** Mapeamento semântico por nome curto (`CASE WHEN owner ILIKE '%wilson%' THEN 'Wilson' ELSE 'Giulia' END`). Mais legível, mas frágil — quebra ao adicionar novos membros sem atualizar a CASE.

**Rationale:** `LOWER(TRIM())` é determinístico, sem manutenção, e resolve os 3 casos de Wilson numa única string `'wilson felipe da silva'`. Agrupamentos por membro passam de 4 linhas para 2.

---

### D3: Manter `payment_data` ou remover?

**Decisão:** Remover do bronze.

**Rationale:** O resultado útil de `payment_data` já está materializado em `peer_account_id` (conta par) e `transaction_kind` (classificação). O JSON bruto no bronze seria útil apenas para reprocessamento da lógica de classificação — mas se a lógica mudar, o enriquecimento já roda em `BEGIN`/`COMMIT` contra a raw, então `payment_data` está sempre acessível em `transactions`. Custo de manter: ~52% das linhas carregam um JSON pesado sem uso analítico direto.

---

### D4: Colunas cc_* — quais manter?

**Manter:** `cc_bill_id`, `cc_total_installments`, `cc_installment_number`, `cc_purchase_date`, `cc_payee_mcc`

**Remover:** `cc_card_number` (mascarado, sem utilidade analítica ou de JOIN)

**Rationale:** As colunas cc mantidas têm uso analítico direto:
- `cc_bill_id` agrupa parcelas do mesmo mês de fatura (drill-down por fatura)
- `cc_total/installment_number` identifica compras parceladas
- `cc_purchase_date` é a data real da compra (vs `date` que é a data de lançamento na fatura)
- `cc_payee_mcc` é base para categorização futura por tipo de estabelecimento

`cc_card_number` mascarado (`****1234`) não serve para nenhuma dessas finalidades.

## Risks / Trade-offs

- **[Risco] `transactions_enriched` ficará vazia durante o sync**: mitigado pela transação BEGIN/COMMIT já existente — a tabela fica no estado anterior se o sync falhar no meio, e fica vazia apenas no intervalo do TRUNCATE até o COMMIT (milissegundos)
- **[Trade-off] `owner_normalized` é string, não FK**: sem tabela `d_members`, não há integridade referencial. Se um banco retornar um owner novo e inesperado, ele entra normalizado mas sem mapeamento semântico. Aceitável no volume atual (2 membros conhecidos)
- **[Risco] Colunas removidas em uso por queries existentes**: verificar MCP tools e views existentes antes de remover

## Migration Plan

1. Atualizar DDL em `schema.sql` (DROP + CREATE com novo schema)
2. Atualizar SQL de enriquecimento em `BunPgAdapter.ts` (remover projeções, adicionar `owner_normalized` via JOIN)
3. Executar no banco: `DROP TABLE transactions_enriched; \i schema.sql` (apenas o trecho novo)
4. Executar `bun run sync` para repopular com o novo schema
5. Validar: contagem = `transactions`; `owner_normalized` com 2 valores distintos

**Rollback:** `DROP TABLE transactions_enriched`. Zero impacto em `transactions`.

## Open Questions

- Alguma MCP tool ou view analítica existente faz referência direta a colunas que serão removidas (ex: `payment_data`, `cc_card_number`, `synced_at`)? Verificar antes de remover.
