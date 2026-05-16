## Why

O projeto não tem persistência local dos dados financeiros do Pluggy. Para evoluir para um servidor MCP com consultas, análises e histórico, precisamos de um script de sincronização que baixe todos os dados e os salve em um banco SQLite local — sem duplicatas, mesmo quando a coleta é executada múltiplas vezes.

## What Changes

- Criação do projeto Bun com TypeScript (`strict: true`)
- Implementação da camada de domínio com entidades e ports (interfaces de repositório e de API)
- Implementação do adapter HTTP para o Pluggy (coleta de items, accounts, investments, transactions, identities)
- Implementação do adapter HTTP para o token local (`http://192.168.0.194:4567/token`)
- Implementação do adapter SQLite com Bun nativo (`bun:sqlite`) com schema completo e estratégia de upsert por entidade
- Script de sincronização (`src/scripts/sync.ts`) que orquestra a coleta e persistência
- Schema SQL com tabelas: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`, `identities`

## Capabilities

### New Capabilities

- `token-provider`: Obter e validar o bearer token a partir do serviço local em `http://192.168.0.194:4567/token`
- `pluggy-collector`: Coletar dados do Pluggy via HTTP (items, accounts, investments, transactions, identities) usando o bearer token
- `db-schema`: Schema SQLite com todas as tabelas necessárias para persistência dos dados financeiros
- `sync-orchestrator`: Use case de sincronização que coordena coleta e persistência com estratégia de deduplicação por entidade

### Modified Capabilities

## Impact

- **Novo projeto**: estrutura de pastas hexagonal em `src/`
- **Runtime**: Bun (substitui Node.js), SQLite nativo via `bun:sqlite`
- **Dependências externas**: serviço de token local em `192.168.0.194:4567`, API `my-api.pluggy.ai`
- **Banco de dados**: arquivo `finance.db` local (path configurável)
- **Tipagem**: TypeScript `strict: true`, sem `any`, todos os shapes de API mapeados como tipos de domínio
