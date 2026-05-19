# Contexto 08 — Parcelas do Cartão: Visibilidade de Crédito

## O que o usuário quer

> "Exibir o valor das parcelas, quantas faltam e total limite usado como saldo devedor."

```
Perguntas que o usuário quer responder:
  - "Quanto ainda vou pagar de parcelas no total?"
  - "Quantas parcelas faltam para esse compromisso acabar?"
  - "Qual é o meu saldo devedor real (parcelas futuras já comprometidas)?"
  - "Quanto do meu limite está realmente comprometido?"
```

---

## Dados já disponíveis no banco

```
Da análise do BunPgAdapter.ts:

f_transacoes / bronze_transactions:
  cc_total_installments    ← total de parcelas (ex: 12)
  cc_installment_number    ← parcela atual (ex: 3)
  
  Saldo devedor implícito = amount × (total - atual + 1)

cube_compromissos_ativos (view já existente!):
  description              ← nome do compromisso
  purchase_day             ← data da compra
  amount                   ← valor da parcela
  cartao                   ← nome do cartão
  dono                     ← membro da família
  installment_atual        ← parcela atual
  total_installments       ← total de parcelas
  compromisso_restante     ← valor total restante (já calculado!)

Contas (accounts):
  cc_credit_limit          ← limite total do cartão
  cc_available_credit      ← limite disponível atual
  saldo_atual              ← saldo devedor da fatura atual
```

**Já temos quase tudo!** A `cube_compromissos_ativos` já calcula o `compromisso_restante`. O endpoint `/api/compromissos` já existe.

---

## O que está faltando

### 1. Agrupamento por cartão

```
Hoje: lista plana de compromissos
Falta: agrupar por cartão + mostrar totais

┌─────────────────────────────────────────────────┐
│ VISA INFINITE                                   │
│ Limite: R$15.000 | Usado: R$7.236 | Livre: R$7.764│
├──────────────────────────┬───────┬──────┬───────┤
│ Compromisso              │ Parc. │ Val. │ Reste │
├──────────────────────────┼───────┼──────┼───────┤
│ iPhone 15 Pro            │  3/21 │ R$400│ R$7.200│
│ Curso Online             │  1/6  │ R$90 │ R$450  │
│ Eletrodoméstico          │  2/10 │ R$200│ R$1.600│
├──────────────────────────┼───────┼──────┼───────┤
│ Total comprometido       │       │      │ R$9.250│
└──────────────────────────┴───────┴──────┴───────┘
```

### 2. Timeline de compromissos

```
Quanto vou pagar de parcelas nos próximos meses?

mai/26: R$1.200 em parcelas (iPhone R$400 + Eletro R$200 + ...)
jun/26: R$1.050 (curso termina)
jul/26: R$1.050
ago/26: R$800 (eletrodoméstico termina)
...
dez/26: R$400 (só o iPhone)
```

### 3. Saldo devedor real vs limite

```
Conceito: "Saldo devedor total" ≠ "fatura atual"

Saldo devedor real = soma de todas as parcelas futuras de todos os cartões
                   = o que você ainda vai pagar independente de quando

Exemplo:
  Fatura atual VISA:       R$2.000
  Parcelas futuras VISA:   R$9.250 (próximos 21 meses)
  ─────────────────────────────────
  Saldo devedor real:     R$11.250
  Limite total:           R$15.000
  Comprometimento real:   75%
```

---

## UX proposta

### Opção A: Expandir a tela "Próx. Mês"

```
A tela Próx. Mês já mostra compromissos em aberto.
Adicionar:
  - Agrupamento por cartão
  - Card de "Saldo Devedor Real"
  - Gráfico de timeline de parcelas
```

### Opção B: Seção dentro de "Investimentos" (tab expandida)

```
Investimentos hoje = patrimônio/saldo
Renomear para "Patrimônio & Crédito"?
  → Ativos: saldos em conta, investimentos
  → Passivos: saldo devedor real, parcelas futuras
  → Patrimônio líquido = Ativos − Passivos
```

### Layout principal proposto

```
┌─────────────────────────────────────────────────────┐
│ Compromissos & Crédito                              │
├────────────────────┬────────────────────────────────┤
│ Saldo Devedor Real │ R$ 18.450                      │
│ Comprometido       │ ████████░░ 68% do limite total │
└────────────────────┴────────────────────────────────┘

Por cartão:
┌────────────────────────────────────────────────────┐
│ 💳 VISA INFINITE          Limite R$15.000          │
│ Fatura atual: R$2.000     Parcelas futuras: R$9.250│
│ ████████░░ 75% comprometido                        │
│                                   [▼ Ver parcelas] │
│ ── expandido ──────────────────────────────────── │
│  iPhone 15 Pro     3/21  R$400/mês  R$7.200 total  │
│  Curso Online      1/6   R$90/mês   R$450 total    │
└────────────────────────────────────────────────────┘

Timeline:
  mai: R$1.200 ████████
  jun: R$1.050 ███████
  jul: R$1.050 ███████
  ago: R$800   █████
```

---

## Nova view SQL necessária

```sql
-- Timeline de parcelas por mês futuro
CREATE OR REPLACE VIEW cube_parcelas_timeline AS
SELECT
  tenant_id,
  -- Cada compromisso tem parcelas dos meses seguintes
  DATE_TRUNC('month', purchase_day::date + 
    (generate_series(installment_atual, total_installments) - installment_atual + 1) 
    * INTERVAL '1 month') AS mes_referencia,
  description,
  cartao,
  amount AS valor_parcela,
  total_installments - installment_atual + 1 AS parcelas_restantes,
  amount * (total_installments - installment_atual + 1) AS total_restante
FROM cube_compromissos_ativos;
```

E uma view de total por mês:
```sql
CREATE OR REPLACE VIEW cube_parcelas_por_mes AS
SELECT
  tenant_id,
  mes_referencia,
  SUM(valor_parcela) AS total_parcelas_mes
FROM cube_parcelas_timeline
GROUP BY tenant_id, mes_referencia
ORDER BY mes_referencia;
```

---

## Questões para o explore

1. **Onde fica na UI**: expandir "Próx. Mês" ou renomear "Investimentos" para "Patrimônio & Crédito" (ativos + passivos)?

2. **`cc_credit_limit`**: o Pluggy sempre traz isso corretamente? Há casos onde vem null?

3. **Saldo devedor real**: o usuário vai entender esse conceito ou é muito técnico? Talvez chamar de "Total a pagar em parcelas"?

4. **Quitação antecipada**: usuário quer poder marcar um compromisso como quitado manualmente? (para quando pagar à vista antes do fim das parcelas)

---

## Dados já disponíveis

```
cube_compromissos_ativos:
  ✅ installment_atual, total_installments
  ✅ compromisso_restante (total restante)
  ✅ cartao, dono, amount

accounts (via patrimônio):
  ✅ cc_credit_limit, cc_available_credit, saldo_atual
```

Falta apenas: view de timeline + agrupamento por cartão no endpoint.

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/infrastructure/db/*.sql` | Views `cube_parcelas_timeline`, `cube_parcelas_por_mes` |
| `src/infrastructure/db/BunPgAdapter.ts` | `getParcelasTimeline()`, `getParcelasAgrupadas()` |
| `src/application/web/routes/compromissos.ts` | Endpoints novos: `/api/compromissos/timeline`, `/api/compromissos/cartoes` |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/tabs/ProximoMes.tsx` | Expandir com agrupamento por cartão + timeline |
| `client/src/components/CompromissosLista.tsx` | Atualizar para mostrar parcela X/Y e total restante |
| `client/src/api/types.ts` | Tipos `ParcelaTimeline`, `CartaoResumo` |

---

## Referências

- **DaisyUI Progress**: https://daisyui.com/components/progress/ (barra de comprometimento de limite)
- **DaisyUI Collapse**: https://daisyui.com/components/collapse/ (expand por cartão)
- **DaisyUI Stat**: https://daisyui.com/components/stat/ (cards de saldo devedor)
- **Recharts BarChart**: já usado no projeto — bom para timeline de parcelas por mês
