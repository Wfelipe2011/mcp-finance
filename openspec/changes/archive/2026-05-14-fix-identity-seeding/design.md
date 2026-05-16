## Context

O sync coleta dados em 5 passos: items → accounts+investments → transactions+investment_transactions → identities → enrich. O passo 4 (identities) chama `GET /identity/?itemId=` na Pluggy API, que retorna HTTP 500 — o endpoint não existe de fato. Isso faz o SyncUseCase encerrar com erro antes de chegar ao `enrich()`, que é o passo que popula `transactions_enriched` e semeia `d_users`. Sem `d_users`, a view `f_transacoes` retorna zero linhas (JOIN falha) e o dashboard fica vazio.

O dado que identities fornecia ao `d_users` (`full_name`) já está disponível em `accounts.owner` — mesma string, mesma pessoa — capturado no passo 3.

## Goals / Non-Goals

**Goals:**
- Corrigir o seeding de `d_users` para usar `accounts.owner` em vez de `identities.full_name`
- Remover a chamada ao endpoint inexistente `fetchIdentity` do fluxo de sync
- Dashboard exibe dados após o primeiro sync limpo

**Non-Goals:**
- Não remover a tabela `identities` ou o código morto de Identity (feito na change `remove-identity-dead-code`)
- Não alterar o fluxo de enriquecimento AI
- Não tratar o caso de `accounts.owner` nulo (sem owner → sem user → sem dados no dashboard; aceitável — é uma conta sem titular identificável)

## Decisions

### D1: Fonte de `owner_normalized` → `accounts.owner` (já disponível)

**Escolha**: O `enrich()` usa `accounts.owner` via JOIN `accounts a ON a.id = t.account_id` — esse JOIN já existe na query de enriquecimento. O seeding de `d_users` passa a ser:
```sql
INSERT INTO d_users (name, display_name)
SELECT DISTINCT LOWER(TRIM(a.owner)), initcap(split_part(a.owner, ' ', 1))
FROM accounts a
WHERE a.owner IS NOT NULL AND TRIM(a.owner) != ''
ON CONFLICT (name) DO NOTHING
```

**Alternativas consideradas**:
- Continuar usando `/identity` com retry/soft-fail → não resolve o problema (endpoint não existe)
- Usar `GET /api/auth/me` do meu.pluggy.ai → requer expor `appSession` ao api-server; overcomplexidade

**Rationale**: Dado já disponível, zero novas dependências, lógica mais simples.

### D2: Remover `identityRepo` do `SyncUseCase` e callers

**Escolha**: Remover o parâmetro `identityRepo` do construtor de `SyncUseCase` e dos dois callers (`sync.ts` e `routes/sync.ts`). Não criar uma implementação no-op — o parâmetro simplesmente deixa de existir.

**Alternativas consideradas**:
- Tornar `identityRepo` opcional com default no-op → mantém o contrato mas obscurece a intenção; preferimos clareza

**Rationale**: Menos código, sem surpresas.

## Risks / Trade-offs

- **[Risk] `accounts.owner` com capitalização inconsistente** → O `LOWER(TRIM())` normaliza antes de inserir em `d_users`; o JOIN em `f_transacoes` usa `owner_normalized` que já aplica `LOWER(TRIM(a.owner))`. Sem risco.
- **[Trade-off] Tabela `identities` continua no schema** → Fica vazia até a change `remove-identity-dead-code` ser aplicada. Sem impacto funcional.
