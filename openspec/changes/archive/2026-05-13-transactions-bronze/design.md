## Context

O banco de dados contém dados brutos do Pluggy (camada raw): a tabela `transactions` com 3.291 registros mistura transações reais (receitas, despesas) com movimentações internas (transferências entre contas da família, pagamentos de fatura de cartão, aportes/resgates de investimento). Qualquer análise de fluxo de caixa sobre `transactions` diretamente produz números inflados.

A família possui 11 contas rastreadas (Wilson + Giulia): Bradesco corrente/poupança, dois Nubankx, PicPay, Digio e cartões associados. Todas estão em `accounts` com `owner` preenchido pelo Pluggy. A chave de detecção de transferência interna está em `payment_data` (JSON serializado): o campo `payer.accountNumber` / `receiver.accountNumber` pode ser cruzado com `accounts.number`.

## Goals / Non-Goals

**Goals:**
- Criar tabela `transactions_enriched` com todas as colunas de `transactions` + `transaction_kind`, `peer_account_id`, `is_real_cashflow`
- Classificar automaticamente cada transação em: `EXPENSE`, `INCOME`, `TRANSFER`, `INVEST`
- Popular a tabela como step final do `SyncUseCase.run()`, após o sync completo
- Não quebrar nenhuma query existente (tabela `transactions` permanece intacta)

**Non-Goals:**
- Classificação manual ou por tags (fora de escopo agora)
- Categorização semântica além do `transaction_kind`
- Views analíticas ou agregações (próxima camada)

## Decisions

### D1: Tabela física vs Materialized View

**Decisão:** Tabela física (`TABLE`), truncada e repopulada a cada sync.

**Alternativa considerada:** `MATERIALIZED VIEW` com `REFRESH MATERIALIZED VIEW`.

**Rationale:** A tabela física permite enriquecimento futuro com dados que não existem no banco (ex: tags manuais, correções, campos externos). Uma Materialized View seria apenas SQL — elegante agora, mas um bloqueio quando precisarmos de dados não-relacionais. O custo de uma tabela extra é desprezível no volume atual (~3k linhas).

**Estratégia de população:** `TRUNCATE` + `INSERT ... SELECT` dentro de uma transação. Garante que a tabela nunca fique em estado parcial.

---

### D2: Lógica de classificação `transaction_kind`

Regras em ordem de prioridade (aplicadas como CASE WHEN em SQL):

```
1. INVEST
   operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')
   → Movimentação de investimento, não é fluxo de caixa

2. TRANSFER (via payment_data — lado crédito)
   type = 'CREDIT'
   AND payment_data::jsonb->'payer'->>'accountNumber' IN (SELECT DISTINCT number FROM accounts)
   → Dinheiro entrou de uma conta nossa

3. TRANSFER (via payment_data — lado débito)
   type = 'DEBIT'
   AND payment_data::jsonb->'receiver'->>'accountNumber' IN (SELECT DISTINCT number FROM accounts)
   → Dinheiro saiu para uma conta nossa

4. TRANSFER (pagamento de fatura — lado conta bancária)
   type = 'DEBIT'
   AND account_id IN (SELECT id FROM accounts WHERE type = 'BANK')
   AND (description ILIKE '%pagamento de fatura%' OR description ILIKE '%gastos cartao%')
   → Débito na conta que representa pagamento para o cartão

5. TRANSFER (recebimento de fatura — lado cartão)
   type = 'CREDIT'
   AND account_id IN (SELECT id FROM accounts WHERE type = 'CREDIT')
   AND (description ILIKE '%pagamento%fatura%' OR description ILIKE '%inclusao pgto%')
   → Crédito no cartão que representa pagamento recebido da conta

6. EXPENSE
   type = 'DEBIT'
   → Débito que não se encaixou em nenhuma regra acima

7. INCOME
   type = 'CREDIT'
   → Crédito que não se encaixou em nenhuma regra acima
```

**Rationale:** A ordem importa — INVEST tem prioridade sobre TRANSFER porque alguns resgates/aportes podem ter `payment_data` preenchido. Fatura de cartão (regras 4 e 5) vem depois de payment_data porque é um fallback textual menos confiável.

---

### D3: Resolução do `peer_account_id` com Bradesco duplicado

O Bradesco tem duas contas com o mesmo `number` (`00054727-1`): corrente e poupança. O JOIN pode retornar 2 linhas.

**Decisão:** Usar `DISTINCT ON (t.id)` com `ORDER BY conta_origem.subtype` preferindo `CHECKING_ACCOUNT` sobre `SAVINGS_ACCOUNT` (transferências PIX saem da corrente, não da poupança).

**Fallback:** Se ainda ambíguo, pegar `MIN(conta_origem.id)` como desempate determinístico.

---

### D4: Onde vive o código de população

**Decisão:** `BunPgAdapter` ganha o método `enrichTransactions(): Promise<void>` que executa o SQL de TRUNCATE + INSERT. `SyncUseCase.run()` chama esse método como step 6.

**Alternativa considerada:** Script separado `enrich.ts`. Rejeitado porque quebra a atomicidade — sync pode terminar sem enriquecimento se o script separado falhar.

---

### D5: Classificação de Giulia → transferência familiar

Wilson e Giulia são casados. Qualquer movimentação entre contas registradas em `accounts` é uma transferência interna (TRANSFER), independente do `owner`. Isso simplifica a lógica: qualquer `accountNumber` ∈ `accounts.number` é "nosso", sem distinção por owner.

## Risks / Trade-offs

- **[Risco] PIX sem `payment_data` preenchido** (ex: PicPay "PIX recebido"): não detectados como TRANSFER via D2. Ficam como INCOME → podem inflar entradas. Mitigação: aceito no curto prazo; futura regra por valor+data pode cobrir esses casos.

- **[Risco] Bancos adicionam contas novas**: se uma nova conta for adicionada ao Pluggy, o sync já a inclui em `accounts`. Como a lógica usa subquery contra `accounts`, ela é automaticamente incluída na detecção. Zero manutenção.

- **[Risco] TRUNCATE + INSERT não é atômico se cair no meio**: mitigado pelo uso de transaction SQL (`BEGIN` / `COMMIT`). Se falhar, a tabela fica no estado anterior.

- **[Trade-off] Tabela física vs View**: tabela duplica ~3k linhas. Irrelevante no volume atual, mas cresce com o tempo. Aceitável para ganhar flexibilidade futura.

## Migration Plan

1. Adicionar DDL de `transactions_enriched` ao `schema.sql` (com `CREATE TABLE IF NOT EXISTS`)
2. Implementar `enrichTransactions()` em `BunPgAdapter.ts`
3. Adicionar step 6 em `SyncUseCase.run()`
4. Executar sync manual para popular pela primeira vez: `bun run sync`
5. Validar contagens: total em `transactions_enriched` = total em `transactions`; verificar distribuição de `transaction_kind`

**Rollback:** DROP TABLE `transactions_enriched`. Sem impacto em `transactions`.

## Open Questions

- Futuramente, como lidar com PIX opacos do PicPay (sem `payment_data.payer`)? Possível spike: match por valor + data ± 1 dia + contas diferentes.
