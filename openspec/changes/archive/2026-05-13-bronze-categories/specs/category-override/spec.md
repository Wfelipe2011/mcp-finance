## ADDED Requirements

### Requirement: Tabela category_overrides para recategorização manual
O sistema SHALL ter uma tabela `category_overrides` com as colunas: `id SERIAL PRIMARY KEY`, `pattern TEXT NOT NULL` (padrão ILIKE aplicado à coluna `description`), `category_id_override TEXT NOT NULL REFERENCES category_labels(category_id)`, `note TEXT` (explicação da regra), `priority INTEGER NOT NULL DEFAULT 100` (menor = mais específico = aplicado primeiro), `match_count INTEGER NOT NULL DEFAULT 0` (contador de matches para auditoria de regras órfãs), `created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)`.

#### Scenario: Inserção de regra válida
- **WHEN** uma regra é inserida com `pattern = '%AMAZON AWS%'` e `category_id_override = '09000000'`
- **THEN** a regra é salva com `match_count = 0`

#### Scenario: Inserção de regra com category_id inválido falha
- **WHEN** uma regra é inserida com `category_id_override` que não existe em `category_labels`
- **THEN** a inserção falha com erro de FK

### Requirement: Override aplicado após INSERT do enriquecimento
Após o `INSERT INTO transactions_enriched`, o sistema SHALL executar um `UPDATE` na mesma transação que aplica os overrides: para cada linha de `transactions_enriched` onde `description ILIKE pattern` de alguma regra em `category_overrides`, atualiza `category_id`, `category_pt`, `category_group`, `category_group_pt` com os valores da regra de menor `priority`. Após o UPDATE, incrementa `match_count` para cada regra que fez ao menos um match.

#### Scenario: Override de menor priority vence conflito entre regras
- **WHEN** uma description bate com duas regras de priorities 10 e 100
- **THEN** a categorização da regra com `priority = 10` é aplicada

#### Scenario: match_count incrementado após sync
- **WHEN** `bun run sync` é executado e uma regra faz N matches
- **THEN** `match_count` da regra é incrementado em N

#### Scenario: Regra sem match não altera match_count
- **WHEN** `bun run sync` é executado e uma regra não faz nenhum match
- **THEN** `match_count` da regra permanece inalterado

#### Scenario: Override atômico com enriquecimento
- **WHEN** o UPDATE de override falha (ex: category_id_override removido)
- **THEN** toda a transação é revertida, incluindo o INSERT do enriquecimento

### Requirement: Regras iniciais de override pré-populadas
O sistema SHALL incluir no schema inicial as seguintes regras de override, corrigindo categorizações conhecidamente erradas do Pluggy:
- `%Amazon AWS%` → `09000000` (Serviços digitais), priority 10
- `%OPENROUTER%` → `09000000` (Serviços digitais), priority 10
- `%NEON.TECH%` → `09000000` (Serviços digitais), priority 10

#### Scenario: Amazon AWS categorizado como Serviços digitais
- **WHEN** o sync é executado com a regra de override para Amazon AWS
- **THEN** todas as transações com `description ILIKE '%Amazon AWS%'` têm `category_id = '09000000'` em `transactions_enriched`

#### Scenario: Regras iniciais são idempotentes
- **WHEN** o seed de `category_overrides` é executado múltiplas vezes
- **THEN** não há duplicatas (usando `INSERT ... ON CONFLICT DO NOTHING` ou equivalente)
