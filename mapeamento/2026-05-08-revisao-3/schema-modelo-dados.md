# Schema de Dados — Modelo Definitivo para MCP Finance

## Entidades principais

### Item (conexão bancária)
```
items {
  id          TEXT PK    -- item_uuid do Pluggy
  connector   TEXT       -- nome do banco (PicPay, Bradesco, Nubank...)
  status      TEXT       -- UPDATED | UPDATING | OUTDATED | LOGIN_ERROR | ...
  executionStatus TEXT   -- SUCCESS | PARTIAL_SUCCESS | ERROR
  products    TEXT       -- JSON array: ["ACCOUNTS","CREDIT_CARDS","TRANSACTIONS",...]
  lastUpdatedAt DATETIME
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME   -- quando o MCP coletou este registro
}
```

### Account (conta bancária ou cartão)
```
accounts {
  id          TEXT PK    -- account_uuid
  itemId      TEXT FK -> items.id
  type        TEXT       -- BANK | CREDIT
  subtype     TEXT       -- CHECKING_ACCOUNT | SAVINGS_ACCOUNT | CREDIT_CARD
  name        TEXT       -- nome da conta
  balance     REAL       -- saldo atual
  currencyCode TEXT      -- BRL
  number      TEXT       -- número da conta
  marketingName TEXT
  taxNumber   TEXT       -- CPF/CNPJ do titular
  owner       TEXT       -- nome do titular
  -- bankData (BANK accounts)
  transferNumber TEXT    -- banco/agência/conta
  closingBalance REAL
  automaticallyInvestedBalance REAL
  overdraftContractedLimit REAL
  overdraftUsedLimit REAL
  unarrangedOverdraftAmount REAL
  -- creditData (CREDIT accounts)
  ccLevel     TEXT       -- GOLD | INFINITE | PLATINUM | ...
  ccBrand     TEXT       -- MASTERCARD | VISA | ELO | ...
  ccBalanceDueDate TEXT  -- data de vencimento
  ccCreditLimit REAL
  ccAvailableCreditLimit REAL
  ccMinimumPayment REAL
  ccBalanceForeignCurrency REAL
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME
}
```

### Transaction (transação bancária ou de cartão)
```
transactions {
  id          TEXT PK    -- transaction_uuid
  accountId   TEXT FK -> accounts.id
  description TEXT
  descriptionRaw TEXT
  currencyCode TEXT
  amount      REAL       -- positivo = crédito, negativo = débito
  amountInAccountCurrency REAL
  date        DATETIME
  category    TEXT       -- categoria semântica (ex: "Digital services")
  categoryId  TEXT       -- código de categoria
  balance     REAL       -- saldo após transação (quando disponível)
  providerCode TEXT
  status      TEXT       -- POSTED | PENDING
  type        TEXT       -- DEBIT | CREDIT
  operationType TEXT     -- PIX | BOLETO | TED | DOC | null
  providerId  TEXT
  order       INTEGER
  -- paymentData (PAYMENT_DATA - presente em transações bancárias)
  pdPaymentMethod TEXT   -- PIX | BOLETO | TED | DEBIT | ...
  pdPayer     TEXT       -- JSON: {name, document, documentType, routingNumber}
  pdReceiver  TEXT       -- JSON: {name, document, documentType, routingNumber}
  pdReason    TEXT
  pdReceiverReferenceId TEXT
  pdReferenceNumber TEXT
  pdBoletoMetadata TEXT  -- JSON
  -- creditCardMetadata (transações de cartão)
  ccCardNumber TEXT
  ccBillId    TEXT       -- UUID da fatura (sem endpoint /bills disponível)
  ccPurchaseDate DATETIME
  ccTotalInstallments INTEGER
  ccInstallmentNumber INTEGER
  ccPayeeMCC  INTEGER    -- Merchant Category Code
  -- outros
  merchant    TEXT       -- JSON ou null
  acquirerData TEXT      -- JSON ou null
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME
}
```

### Investment (ativo financeiro)
```
investments {
  id          TEXT PK    -- investment_uuid
  itemId      TEXT FK -> items.id
  name        TEXT
  type        TEXT       -- FIXED_INCOME | EQUITY | MUTUAL_FUND | ...
  subtype     TEXT       -- CDB | STOCK | LCI | LCA | DEB | ...
  balance     REAL       -- valor atual (0 se inativo)
  currencyCode TEXT
  value       REAL       -- valor unitário
  quantity    REAL       -- quantidade de cotas/unidades
  amount      REAL       -- montante total aplicado
  taxes       REAL
  taxes2      REAL
  amountProfit REAL
  amountWithdrawal REAL
  amountOriginal REAL
  -- taxas e retorno
  lastMonthRate REAL
  lastTwelveMonthsRate REAL
  annualRate  REAL
  fixedAnnualRate REAL
  rate        REAL
  rateType    TEXT
  -- identificação
  code        TEXT       -- ticker (ex: ALLD3)
  isin        TEXT       -- código ISIN internacional
  number      TEXT
  metadata    TEXT
  -- emissão
  issuer      TEXT
  issuerCNPJ  TEXT
  issueDate   DATETIME
  purchaseDate DATETIME
  dueDate     DATETIME
  date        DATETIME   -- data de referência
  owner       TEXT
  institution TEXT
  status      TEXT       -- ACTIVE | INACTIVE
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME
}
```

### InvestmentTransaction (movimentação de investimento)
```
investment_transactions {
  id          TEXT PK    -- inv_txn_uuid
  investmentId TEXT FK -> investments.id
  description TEXT
  amount      REAL       -- valor bruto da operação
  value       REAL       -- valor unitário no momento
  quantity    REAL       -- quantidade movimentada
  tradeDate   DATETIME   -- data do negócio
  date        DATETIME   -- data de liquidação
  type        TEXT       -- BUY | SELL | TRANSFER | YIELD | ...
  netAmount   REAL       -- valor líquido após custos
  movementType TEXT      -- CREDIT | DEBIT
  brokerageNumber TEXT   -- nota de corretagem (BROKERAGE_NOTE)
  agreedRate  REAL
  -- expenses (custos/impostos)
  expIncomeTax REAL      -- imposto de renda
  expBrokerageFee REAL   -- taxa de corretagem
  expServiceTax REAL     -- taxa de serviço
  expSettlementFee REAL  -- taxa de liquidação
  expClearingFee REAL    -- taxa de câmara
  expStockExchangeFee REAL
  expCustodyFee REAL
  expOperatingFee REAL
  expTradingAssetsNoticeFee REAL
  expMaintenanceFee REAL
  expOther    REAL
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME
}
```

### Identity (dados pessoais/financeiros por conexão)
```
identities {
  id          TEXT PK    -- identity_uuid
  itemId      TEXT FK -> items.id UNIQUE
  fullName    TEXT
  birthDate   DATE
  taxNumber   TEXT       -- CPF
  document    TEXT
  documentType TEXT
  jobTitle    TEXT
  companyName TEXT
  phoneNumbers TEXT      -- JSON array
  emails      TEXT       -- JSON array
  addresses   TEXT       -- JSON array
  relations   TEXT       -- JSON ou null
  investorProfile TEXT   -- JSON ou null
  establishmentCode TEXT
  establishmentName TEXT
  -- financialRelationships
  frStartDate DATETIME   -- início do relacionamento com o banco
  frProductsServicesType TEXT -- JSON array (ex: ["CONTA_PAGAMENTO_PRE_PAGA","CARTAO_CREDITO"])
  frProcurators TEXT     -- JSON array
  frAccounts  TEXT       -- JSON array
  -- qualifications
  qualCompanyCnpj TEXT
  qualInformedIncomeAmount REAL     -- renda declarada
  qualInformedIncomeFrequency TEXT  -- MENSAL | ANUAL | ...
  qualInformedIncomeDate DATE
  createdAt   DATETIME
  updatedAt   DATETIME
  syncedAt    DATETIME
}
```

---

## Notas sobre LOANS

LOANS é coletado pelo Pluggy durante a sincronização (confirmado durante esta rodada: widget exibiu "Coletando dados de empréstimos." a 89%), mas os dados **não são expostos** pelo proxy `my-api.pluggy.ai`. Se houver necessidade futura, seria necessário:
- Acesso direto à API do Pluggy (não ao proxy consumidor)
- Ou parsing adicional de dados no campo `financialRelationships` da identity

---

## Estratégia de sincronização recomendada

```
1. Verificar validade do token: GET /api/access-token
2. Listar conexões: GET /items?only_my_items=true
3. Para cada conjunto de items (batch):
   a. GET /accounts?itemId=a&itemId=b&...
   b. GET /investments?itemId=a&itemId=b&...
4. Para cada accountId (fan-out):
   a. GET /transactions?accountId={uuid}
5. Para cada investmentId (fan-out):
   a. GET /investments/{uuid}/transactions
6. Para cada itemId (fan-out identity):
   a. GET /identity/?itemId={uuid}
7. Upsert todos os dados no SQLite local
```

**Volume estimado** (baseado nos dados reais do usuário):
- 5 items
- 11 accounts
- ~2.300 transactions (média 200-500 por conta)
- 87 investments
- ~200 investment transactions
- 5 identities
