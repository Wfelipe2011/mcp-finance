## Context

A tabela `transactions_enriched` (bronze layer) foi criada pela change `transactions-bronze` e refinada em `bronze-schema-refine`. Ela contém 3.295 transações derivadas de `transactions` via `TRUNCATE + INSERT … SELECT` a cada sync.

Situação atual:
- 3.245 transações com `currency_code = 'BRL'` e `amount_in_account_currency = NULL` (sem conversão — são nativas BRL)
- 50 transações com `currency_code = 'USD'`, todas de um único cartão (Digio Visa Gold Internacional, conta BRL). Para 49 dessas, `amount_in_account_currency` contém o valor em BRL já calculado pelo Pluggy. Para 1 (IOF de USD 0.01), `amount_in_account_currency = NULL`.

O Pluggy já resolve a conversão USD→BRL no campo `amount_in_account_currency`. Não há necessidade de taxa de câmbio externa — o valor BRL está disponível diretamente.

## Goals / Non-Goals

**Goals:**
- `amount` em `transactions_enriched` representa sempre BRL após a change
- `currency_code` em `transactions_enriched` é sempre `'BRL'`
- `amount_in_account_currency` removido (redundante pós-normalização)
- Tabela repopulada via sync normal (DROP + CREATE + `bun run sync`)

**Non-Goals:**
- Normalização de moedas na tabela `transactions` (raw — intocável)
- Suporte a múltiplas moedas de destino (só BRL)
- Conversão histórica com taxa de câmbio externa (Pluggy já fornece o valor convertido)
- Tratamento de contas em moeda estrangeira nativa (não existem no dataset atual)

## Decisions

### D1: Lógica de normalização do `amount`

**Decisão:**
```sql
COALESCE(
  CASE WHEN t.currency_code != 'BRL' THEN t.amount_in_account_currency ELSE NULL END,
  t.amount
) AS amount
```

Equivale a: se a transação não é BRL, usa `amount_in_account_currency`; senão usa `amount`. Para o caso NULL (IOF de USD 0.01 sem valor BRL), o COALESCE cai no `t.amount` original (USD 0.01) — erro analítico de ~R$ 0.05, aceitável.

**Alternativa considerada:** `COALESCE(amount_in_account_currency, 0)` para qualquer USD. Rejeitada: perderia o valor original para o único caso NULL em vez de aproximar com o valor USD.

**Alternativa considerada:** `COALESCE(amount_in_account_currency, amount)` sem filtro de moeda. Equivalente funcionalmente para o dataset atual, mas semanticamente errado se `amount_in_account_currency` vier preenchido para transações BRL no futuro (possível mudança no Pluggy). A condição explícita `currency_code != 'BRL'` é mais defensiva.

---

### D2: `currency_code` fixo em `'BRL'`

**Decisão:** SELECT projeta a literal `'BRL'` como `currency_code` — não usa `t.currency_code`.

**Rationale:** Após normalizar `amount` para BRL, manter `currency_code = 'USD'` cria inconsistência semântica. A coluna passaria a mentir sobre a moeda do valor. Fixar em `'BRL'` torna o schema auto-explicativo.

---

### D3: Remover `amount_in_account_currency` do schema

**Decisão:** Coluna removida de `transactions_enriched`. Disponível em `transactions` (raw) se necessário.

**Rationale:** Após a normalização, `amount_in_account_currency` seria sempre igual a `amount` — redundância total. Manter a coluna aumentaria o schema sem valor analítico.

---

### D4: Estratégia de migração — DROP TABLE + repopulação

**Decisão:** Mesmo padrão de `bronze-schema-refine`: `DROP TABLE transactions_enriched` + `CREATE TABLE` com novo DDL + `bun run sync`.

**Rationale:** Tabela 100% derivada, sem dado original. DROP + recreate é mais simples que ALTER TABLE e garante estado consistente.

## Risks / Trade-offs

- **[Risco] 1 transação com amount aproximado**: IOF de USD 0.01 ficará com `amount = 0.01` (USD) em vez do valor BRL correto (~R$ 0.05). Erro de R$ 0.04 no total — desprezível analiticamente.
- **[Trade-off] Perda da moeda original**: após o bronze, não é mais possível saber que a transação foi em USD sem consultar `transactions`. Aceitável — `transactions` é a fonte raw intacta.
- **[Risco] Pluggy preencher `amount_in_account_currency` para transações BRL no futuro**: a condição `currency_code != 'BRL'` protege contra isso — transações BRL sempre usarão `t.amount` independente de `amount_in_account_currency`.

## Migration Plan

1. Atualizar DDL em `schema.sql` (remover `amount_in_account_currency`, nova semântica de `amount` e `currency_code`)
2. Atualizar SQL de enriquecimento em `BunPgAdapter.ts` (COALESCE + `'BRL'` literal)
3. No banco: `DROP TABLE transactions_enriched` + aplicar novo DDL
4. `bun run sync` para repopular
5. Validar: `SELECT DISTINCT currency_code FROM transactions_enriched` → apenas `'BRL'`; `SELECT COUNT(*) FROM transactions_enriched WHERE amount < 0` para verificar débitos preservados
