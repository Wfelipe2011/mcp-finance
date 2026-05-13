# Modelo de Dados Sugerido (Movimentacao Monetaria)

Status: exploracao (sem implementacao)

## Objetivo

Separar claramente movimentos de conta e movimentos de investimento, preservando rastreabilidade ao item/conexao de origem.

## Tabelas nucleares

### 1) bank_account_transactions

- source_transaction_id (PK logica, vindo do endpoint)
- account_id
- connector_item_id (opcional, derivado por join com account)
- amount
- currency_code
- transaction_type (CREDIT/DEBIT)
- operation_type (PIX, TED, etc)
- status (POSTED, PENDING, ...)
- category
- category_id
- description
- description_raw
- occurred_at (campo `date` da API)
- provider_id
- payment_data_json (JSON bruto normalizado)
- created_at_source
- updated_at_source
- ingested_at

Indice recomendado:
- (account_id, occurred_at desc)
- (operation_type, occurred_at desc)
- (transaction_type, occurred_at desc)

### 2) investment_transactions

- source_investment_transaction_id (PK logica)
- investment_id
- connector_item_id (opcional)
- movement_type (CREDIT/DEBIT)
- trade_type (BUY/SELL/...)
- amount
- net_amount
- value
- quantity
- trade_date
- occurred_at (campo `date` da API)
- expenses_json
- agreed_rate
- broker_number
- ingested_at

Indice recomendado:
- (investment_id, occurred_at desc)
- (movement_type, occurred_at desc)

## Tabelas de suporte (dimensoes)

### 3) accounts_dim

- account_id (PK)
- item_id
- account_type
- account_subtype
- name
- owner
- currency_code
- status_snapshot
- raw_json
- updated_at_source

### 4) investments_dim

- investment_id (PK)
- item_id
- investment_type
- investment_subtype
- name
- issuer
- currency_code
- position_balance
- quantity
- value
- due_date
- raw_json
- updated_at_source

## Chaves de deduplicacao

- bank_account_transactions: source_transaction_id
- investment_transactions: source_investment_transaction_id

## Estrategia de ingestao sugerida

1. Pull base de itens (`/items?only_my_items=true`)
2. Pull contas (`/accounts?itemId=...`)
3. Pull investimentos (`/investments?itemId=...`)
4. Fan-out:
   - `/transactions?accountId=...`
   - `/investments/{investmentId}/transactions`
5. Upsert por chave logica + marca `ingested_at`

## Observacao de comportamento da UI

Na tela /cash, filtros (Todos/Entradas/Saidas e conexao) foram observados como filtro local, sem nova chamada de rede. O coletor de backend deve confiar no fan-out por accountId/investmentId, nao em interacoes de filtro da UI.
