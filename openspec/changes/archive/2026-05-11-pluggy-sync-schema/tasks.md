## 1. Inicialização do Projeto

- [x] 1.1 Inicializar projeto Bun com `bun init` e configurar `tsconfig.json` com `strict: true`, `moduleResolution: bundler`, `target: ES2022`
- [x] 1.2 Criar estrutura de pastas: `src/domain/entities/`, `src/domain/ports/repositories/`, `src/application/sync/`, `src/infrastructure/pluggy/`, `src/infrastructure/token/`, `src/infrastructure/db/`, `src/scripts/`

## 2. Entidades de Domínio

- [x] 2.1 Criar `src/domain/entities/Item.ts` com tipo `Item` refletindo todos os campos do schema
- [x] 2.2 Criar `src/domain/entities/Account.ts` com tipo `Account` incluindo campos bankData e creditData
- [x] 2.3 Criar `src/domain/entities/Transaction.ts` com tipo `Transaction` incluindo paymentData e creditCardMetadata
- [x] 2.4 Criar `src/domain/entities/Investment.ts` com tipo `Investment` incluindo todos os campos de taxa/retorno
- [x] 2.5 Criar `src/domain/entities/InvestmentTransaction.ts` com tipo `InvestmentTransaction` incluindo campos de expenses
- [x] 2.6 Criar `src/domain/entities/Identity.ts` com tipo `Identity` incluindo arrays JSON e financialRelationships

## 3. Ports (Interfaces)

- [x] 3.1 Criar `src/domain/ports/TokenPort.ts` com interface `TokenPort { getToken(): Promise<string> }`
- [x] 3.2 Criar `src/domain/ports/PluggyPort.ts` com interface `PluggyPort` declarando todos os métodos de coleta (`fetchItems`, `fetchAccounts`, `fetchInvestments`, `fetchTransactions`, `fetchInvestmentTransactions`, `fetchIdentity`)
- [x] 3.3 Criar ports de repositório: `ItemRepository.ts`, `AccountRepository.ts`, `TransactionRepository.ts`, `InvestmentRepository.ts`, `InvestmentTransactionRepository.ts`, `IdentityRepository.ts` — cada um com método `upsertMany(entities)` (ou `insertMany` para investment_transactions)

## 4. Infrastructure — Token Adapter

- [x] 4.1 Criar `src/infrastructure/token/TokenHttpAdapter.ts` implementando `TokenPort` — faz GET em `TOKEN_URL` (env var com fallback para `http://192.168.0.194:4567/token`), valida resposta, verifica `expires_at` e loga warning se expirado

## 5. Infrastructure — Pluggy HTTP Adapter

- [x] 5.1 Criar `src/infrastructure/pluggy/PluggyMappers.ts` com funções de mapeamento de API response para cada entidade de domínio
- [x] 5.2 Criar `src/infrastructure/pluggy/PluggyHttpAdapter.ts` implementando `PluggyPort` — recebe bearer token no construtor, implementa todos os métodos de coleta com tratamento de erro HTTP descritivo
- [x] 5.3 Implementar lógica de paginação em `fetchTransactions` — verificar campos `total` e `pageSize` no response e iterar páginas se necessário

## 6. Infrastructure — SQLite Schema

- [x] 6.1 Criar `src/infrastructure/db/schema.sql` com `CREATE TABLE IF NOT EXISTS` para todas as 6 tabelas (`items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `identities`) com todos os campos do mapeamento
- [x] 6.2 Adicionar `CREATE INDEX IF NOT EXISTS` no schema para: `(accountId, date DESC)` em transactions, `(investmentId, date DESC)` em investment_transactions, `(itemId)` em accounts e investments

## 7. Infrastructure — SQLite Adapter (Repositories)

- [x] 7.1 Criar `src/infrastructure/db/BunSQLiteAdapter.ts` — abre banco via `bun:sqlite`, lê `DB_PATH` do env com fallback `./finance.db`, executa schema na inicialização
- [x] 7.2 Implementar `upsertMany` para `items`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` todos os campos + syncedAt
- [x] 7.3 Implementar `upsertMany` para `accounts`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` todos os campos + syncedAt
- [x] 7.4 Implementar `upsertMany` para `transactions`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` apenas campos mutáveis (`status`, `description`, `syncedAt`) — `createdAt` NUNCA sobrescrito
- [x] 7.5 Implementar `upsertMany` para `investments`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` todos os campos + syncedAt
- [x] 7.6 Implementar `insertMany` para `investment_transactions`: `INSERT OR IGNORE INTO` — nunca modifica registros existentes
- [x] 7.7 Implementar `upsertMany` para `identities`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` todos os campos + syncedAt
- [x] 7.8 Envolver cada `upsertMany`/`insertMany` em `db.transaction()` para atomicidade por batch

## 8. Application — SyncUseCase

- [x] 8.1 Criar `src/application/sync/SyncUseCase.ts` recebendo via construtor: `TokenPort`, `PluggyPort`, e todos os repositories
- [x] 8.2 Implementar método `run()`: (1) obter token, (2) fetch + upsert items, (3) batch fetch + upsert accounts e investments, (4) `Promise.all` de todos os fan-outs de transactions, (5) upsert identities
- [x] 8.3 Adicionar logs de progresso: início, contagens por entidade, tempo total de execução

## 9. Script de Entrada

- [x] 9.1 Criar `src/scripts/sync.ts` — instancia adaptors, injeta no `SyncUseCase`, chama `run()`, captura exceções e encerra com `process.exit(1)` em caso de erro
- [x] 9.2 Adicionar script `"sync": "bun run src/scripts/sync.ts"` no `package.json`

## 10. Verificação

- [x] 10.1 Executar `bun run sync` e confirmar que as 6 tabelas são criadas e populadas sem erros
- [x] 10.2 Verificar ausência de duplicatas re-executando o sync e confirmando que os contadores no log batem com a primeira execução
- [x] 10.3 Verificar que `createdAt` em `transactions` não foi sobrescrito na re-execução
