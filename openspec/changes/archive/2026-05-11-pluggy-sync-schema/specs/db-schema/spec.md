## ADDED Requirements

### Requirement: Criar schema no primeiro uso
O sistema SHALL criar todas as tabelas via `CREATE TABLE IF NOT EXISTS` na inicialização do banco, garantindo idempotência — rodar múltiplas vezes não deve causar erros.

#### Scenario: Primeira inicialização do banco
- **WHEN** o arquivo `finance.db` não existe ou está vazio
- **THEN** todas as tabelas são criadas sem erro e o banco fica pronto para uso

#### Scenario: Banco já inicializado
- **WHEN** o arquivo `finance.db` já contém as tabelas
- **THEN** a inicialização completa sem erro e sem alterar dados existentes

### Requirement: Tabela items
O sistema SHALL ter tabela `items` com campos: `id` (TEXT PK), `connector` (TEXT), `status` (TEXT), `executionStatus` (TEXT), `products` (TEXT — JSON array serializado), `lastUpdatedAt` (TEXT), `createdAt` (TEXT), `updatedAt` (TEXT), `syncedAt` (TEXT).

#### Scenario: Upsert de item existente
- **WHEN** um item com mesmo `id` é inserido novamente
- **THEN** todos os campos são atualizados incluindo `syncedAt`, sem duplicar a linha

### Requirement: Tabela accounts
O sistema SHALL ter tabela `accounts` com campos: `id` (TEXT PK), `itemId` (TEXT FK→items.id), `type` (TEXT), `subtype` (TEXT), `name` (TEXT), `balance` (REAL), `currencyCode` (TEXT), `number` (TEXT), `owner` (TEXT), `taxNumber` (TEXT), `marketingName` (TEXT), campos de bankData e creditData conforme mapeamento, `syncedAt` (TEXT).

#### Scenario: Upsert de account com saldo atualizado
- **WHEN** uma account já existe e o saldo mudou
- **THEN** o novo saldo é persistido e `syncedAt` é atualizado

### Requirement: Tabela transactions com preservação de createdAt
O sistema SHALL ter tabela `transactions` com campos: `id` (TEXT PK), `accountId` (TEXT FK→accounts.id), `description` (TEXT), `descriptionRaw` (TEXT), `currencyCode` (TEXT), `amount` (REAL), `amountInAccountCurrency` (REAL), `date` (TEXT), `category` (TEXT), `categoryId` (TEXT), `balance` (REAL), `status` (TEXT), `type` (TEXT), `operationType` (TEXT), `providerCode` (TEXT), `providerId` (TEXT), `order` (INTEGER), campos de paymentData serializados como JSON (`paymentData` TEXT), campos de creditCardMetadata, `merchant` (TEXT), `acquirerData` (TEXT), `createdAt` (TEXT — preservado no upsert, nunca sobrescrito), `syncedAt` (TEXT).

#### Scenario: Upsert de transaction PENDING que virou POSTED
- **WHEN** a mesma transaction é re-inserida com status diferente
- **THEN** o `status` é atualizado, `syncedAt` é atualizado e `createdAt` permanece o valor original

#### Scenario: Re-inserção de transaction já existente com mesmo status
- **WHEN** a mesma transaction é inserida novamente sem mudanças
- **THEN** apenas `syncedAt` é atualizado, demais campos mantêm valor

### Requirement: Tabela investments
O sistema SHALL ter tabela `investments` com campos: `id` (TEXT PK), `itemId` (TEXT FK→items.id), `name` (TEXT), `type` (TEXT), `subtype` (TEXT), `balance` (REAL), `currencyCode` (TEXT), `value` (REAL), `quantity` (REAL), `amount` (REAL), `taxes` (REAL), `amountProfit` (REAL), `code` (TEXT), `isin` (TEXT), `issuer` (TEXT), `issuerCNPJ` (TEXT), `issueDate` (TEXT), `purchaseDate` (TEXT), `dueDate` (TEXT), `status` (TEXT), `annualRate` (REAL), `lastTwelveMonthsRate` (REAL), e demais campos de taxa/retorno do mapeamento, `syncedAt` (TEXT).

#### Scenario: Upsert de investment com balance atualizado
- **WHEN** um investment com mesmo `id` é inserido novamente com novo `balance`
- **THEN** todos os campos são atualizados e `syncedAt` atualizado

### Requirement: Tabela investment_transactions com INSERT OR IGNORE
O sistema SHALL ter tabela `investment_transactions` com campos: `id` (TEXT PK), `investmentId` (TEXT FK→investments.id), `description` (TEXT), `amount` (REAL), `value` (REAL), `quantity` (REAL), `tradeDate` (TEXT), `date` (TEXT), `type` (TEXT), `netAmount` (REAL), `movementType` (TEXT), `brokerageNumber` (TEXT), `agreedRate` (REAL), campos de expenses como `expIncomeTax`, `expBrokerageFee`, `expServiceTax`, etc. (REAL), `syncedAt` (TEXT). Inserção SHALL usar `INSERT OR IGNORE` — linhas existentes nunca são modificadas.

#### Scenario: Re-inserção de investment transaction já existente
- **WHEN** uma investment transaction com mesmo `id` é inserida novamente
- **THEN** a linha existente não é modificada (INSERT OR IGNORE)

### Requirement: Tabela identities
O sistema SHALL ter tabela `identities` com campos: `id` (TEXT PK), `itemId` (TEXT FK→items.id UNIQUE), `fullName` (TEXT), `birthDate` (TEXT), `taxNumber` (TEXT), `document` (TEXT), `documentType` (TEXT), `jobTitle` (TEXT), `phoneNumbers` (TEXT — JSON), `emails` (TEXT — JSON), `addresses` (TEXT — JSON), `qualInformedIncomeAmount` (REAL), `qualInformedIncomeFrequency` (TEXT), `frStartDate` (TEXT), `frProductsServicesType` (TEXT — JSON), `syncedAt` (TEXT).

#### Scenario: Upsert de identity por item
- **WHEN** a identity de um item é inserida novamente
- **THEN** todos os campos são atualizados e `syncedAt` atualizado

### Requirement: Timestamps armazenados como TEXT ISO 8601
O sistema SHALL armazenar todos os timestamps como TEXT no formato ISO 8601 (`YYYY-MM-DDTHH:MM:SS.sssZ`), sem conversão para INTEGER ou REAL, preservando o formato original da API.

#### Scenario: Inserção de timestamp com fuso horário
- **WHEN** um campo de data da API contém string ISO 8601 com timezone
- **THEN** o valor é armazenado como TEXT sem transformação

### Requirement: Índices para consultas comuns
O sistema SHALL criar índices: `(accountId, date DESC)` em `transactions`, `(investmentId, date DESC)` em `investment_transactions`, `(itemId)` em `accounts` e `investments`.

#### Scenario: Criação de índices na inicialização
- **WHEN** o banco é inicializado
- **THEN** todos os índices são criados via `CREATE INDEX IF NOT EXISTS`
