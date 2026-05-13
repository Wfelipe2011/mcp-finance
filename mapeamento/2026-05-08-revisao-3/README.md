# Revisão 3 - Cobertura Financeira Completa

**Data**: 2026-05-08  
**Rodada**: 3  
**Foco**: Verificar lacunas de LOANS, PAYMENT_DATA, BROKERAGE_NOTE, cartões, investimentos

---

## Novas descobertas desta rodada

### 1. Batch queries em /accounts e /investments

O endpoint aceita **múltiplos itemIds** em uma única chamada:

```
GET /accounts?itemId=a&itemId=b&itemId=c&itemId=d&itemId=e
GET /investments?itemId=a&itemId=b&itemId=c&itemId=d&itemId=e
```

Observado na página `/assets` — carrega todas as contas e investimentos de todas as conexões em duas chamadas batch ao invés de N chamadas individuais.

### 2. Investments com transactions inline

A resposta do endpoint `/investments?itemId=...` inclui um campo `transactions[]` dentro de cada investment com transações recentes embutidas. Isso é adicional ao endpoint separado `/investments/{id}/transactions`.

### 3. Fluxo "Atualizar" (sincronização)

Clicar em "Atualizar" em `/connections/{itemId}` dispara:

```
POST /api/connect-token
Body: { "clientUserId": "my-pluggy:{email}", "itemId": "{item_uuid}" }
```

O Pluggy Connect Widget é aberto em iframe e exibiu:
- Status: `UPDATING` / `LOANS_IN_PROGRESS` 
- Mensagem: "Coletando dados de empréstimos." (89%)

**Isso confirma que dados de LOANS são coletados durante o sync.**

### 4. LOANS — confirmado coletado, não exposto no dashboard

```
execution_status=LOANS_IN_PROGRESS (capturado na URL do widget)
"Coletando dados de empréstimos." → mensagem no widget
```

Apesar da coleta, nenhum endpoint `/loans` existe no proxy `my-api.pluggy.ai`. Nenhuma conta com `subtype: LOAN` aparece em `/accounts`. O produto LOANS está em `item.products[]` mas seus dados não são acessíveis pelo dashboard consumidor.

### 5. PAYMENT_DATA → campo paymentData nas transações

Confirma-se que `PAYMENT_DATA` é o campo `paymentData` presente em transações bancárias:

```json
{
  "paymentData": {
    "payer": null,
    "paymentMethod": "BOLETO",
    "reason": null,
    "receiver": null,
    "receiverReferenceId": null,
    "referenceNumber": null,
    "boletoMetadata": null
  }
}
```

### 6. BROKERAGE_NOTE → campo brokerageNumber nas transações de investimento

Confirmado para tipo `EQUITY/STOCK` (Nubank — ALLD3):

```json
{
  "brokerageNumber": "4720983",
  "type": "SELL",
  "netAmount": 7.4
}
```

### 7. Tipos de investimento confirmados

| Tipo | Subtipo | Exemplo | Banco |
|------|---------|---------|-------|
| FIXED_INCOME | CDB | CDB - PICPAY INSTITUICAO... | PicPay, Bradesco, Nubank, Digio |
| EQUITY | STOCK | ALLD3 (Alldaylong) | Nubank |

86 investimentos FIXED_INCOME/CDB + 1 EQUITY/STOCK nos dados do usuário.

### 8. Campos novos documentados

**account.bankData**:
- `transferNumber` (banco/agência/conta formatado)
- `closingBalance`
- `automaticallyInvestedBalance`
- `overdraftContractedLimit`, `overdraftUsedLimit`, `unarrangedOverdraftAmount`

**account.creditData.disaggregatedCreditLimits[]**:
- `lineName`, `usedAmount`, `limitAmount`, `availableAmount`
- `consolidationType`, `creditLineLimitType`, `identificationNumber`

**identity.qualifications**:
- `informedIncome.amount` → renda declarada (ex: R$7.000/mês)
- `informedIncome.frequency` → MENSAL
- `companyCnpj`

**identity.financialRelationships**:
- `productsServicesType[]` → lista de produtos do usuário no banco
- `startDate` → data de início do relacionamento bancário

**investmentTransaction.expenses**:
```json
{
  "id": "{uuid}",
  "incomeTax": 0.0,
  "brokerageFee": null,
  "serviceTax": null,
  "settlementFee": null,
  "clearingFee": null,
  "stockExchangeFee": null,
  "custodyFee": null,
  "operatingFee": null,
  "tradingAssetsNoticeFee": null,
  "maintenanceFee": null,
  "other": null
}
```

---

## Mapa visual completo do pipeline

```
+------------------------------+
| GET /api/access-token        |
+------+-------+---------------+
       |       |
       v       v
+------+-------+
| GET /items?  |
| only_my_items|
+------+---+---+
       |   |
       |   +----------------------------------+
       |                                      |
       v (por item ou batch)                  v
+------+-------+   +----------------------+   |
| GET /accounts|   | GET /investments     |   |
| ?itemId=a&b..|   | ?itemId=a&b..        |   |
+------+-------+   +--------+-------------+   |
       |                    |                  |
       v (por accountId)    | inline txns      v
+-------------------+       | +----------------+------+
| GET /transactions |       | | GET /investments/{id} |
| ?accountId={uuid} |       | | /transactions         |
+-------------------+       | +-----------------------+
                            |
                            v (incluso na resposta)
                       investment.transactions[]

+ por item individualmente:
+---------------------------+
| GET /identity/            |
| ?itemId={uuid}            |
+---------------------------+
```

### Endpoints de sessão/setup:
```
GET  /api/auth/me                        → session check
GET  /api/access-token                   → JWT
POST /api/connect-token                  → nova conexão (sem itemId)
POST /api/connect-token {itemId}         → sincronizar/atualizar conexão existente
```

---

## Status final das lacunas

| Produto do item | Status | Forma de acesso |
|-----------------|--------|-----------------|
| ACCOUNTS | ✅ exposto | GET /accounts?itemId=... |
| CREDIT_CARDS | ✅ exposto | GET /accounts?itemId=... (subtype=CREDIT_CARD) |
| TRANSACTIONS | ✅ exposto | GET /transactions?accountId=... |
| INVESTMENTS | ✅ exposto | GET /investments?itemId=... |
| IDENTITY | ✅ exposto | GET /identity/?itemId=... |
| INVESTMENTS_TRANSACTIONS | ✅ exposto | GET /investments/{id}/transactions |
| PAYMENT_DATA | ✅ incorporado | campo paymentData nas transações |
| BROKERAGE_NOTE | ✅ incorporado | campo brokerageNumber nas inv transactions |
| LOANS | ⚠️ coletado, não exposto | confirmado pelo widget (89%), sem endpoint |

---

## Endpoints investigados mas inexistentes no proxy consumidor

| URL testada | Resultado |
|-------------|-----------|
| GET /loans?itemId=... | 404 |
| GET /payment-data?itemId=... | 404 |
| GET /brokerage-notes?itemId=... | 404 |
| GET /bills/{billId} | 404 |
| GET /accounts/{id}/bills | 404 |
| GET /items/{id} | 405 (rota existe mas não aceita GET individual) |
| GET /balances | 404 |
| GET /net-worth | 404 |
| GET /executions?itemId=... | 404 |

---

## Para o pipeline MCP

O pipeline de ingestão definitivo tem **9 endpoints** em 2 categorias:

### Setup (1x por sessão)
1. `GET /api/access-token` → Bearer token

### Enumeração (1x por sync completo)
2. `GET /items?only_my_items=true` → descobrir itemIds e products disponíveis

### Coleta batch (1 chamada para N itens)
3. `GET /accounts?itemId=a&itemId=b...` → contas (banco + cartão)
4. `GET /investments?itemId=a&itemId=b...` → investimentos + transactions inline

### Fan-out por accountId (N chamadas)
5. `GET /transactions?accountId={uuid}` → uma por conta

### Fan-out por investmentId (N chamadas)  
6. `GET /investments/{uuid}/transactions` → uma por investimento

### Fan-out por itemId para identity (N chamadas)
7. `GET /identity/?itemId={uuid}` → uma por item

### Dados de controle (opcionais)
8. `GET /api/auth/me` → verificar sessão
9. `POST /api/connect-token` → gerenciar conexões/sync
