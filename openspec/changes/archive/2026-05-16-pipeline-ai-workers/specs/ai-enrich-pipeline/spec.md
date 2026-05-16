## ADDED Requirements

### Requirement: Tabela `workers` tem coluna `kind` para distinguir tipo de worker
O sistema SHALL adicionar coluna `kind TEXT NOT NULL DEFAULT 'enrich' CHECK (kind IN ('enrich', 'digest', 'forecast'))` à tabela `workers`. O supervisor SHALL usar `kind` para escolher o script a spawnar por processo filho.

#### Scenario: Supervisor spawna enrich-worker para kind='enrich'
- **WHEN** há um worker com `kind='enrich'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/enrich-worker.ts` para esse worker

#### Scenario: Supervisor spawna digest-worker para kind='digest'
- **WHEN** há um worker com `kind='digest'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/digest-worker.ts` para esse worker

#### Scenario: Supervisor spawna forecast-worker para kind='forecast'
- **WHEN** há um worker com `kind='forecast'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/forecast-worker.ts` para esse worker

#### Scenario: Workers existentes (kind='enrich') não são afetados
- **WHEN** há workers existentes sem `kind` explícito (DEFAULT 'enrich')
- **THEN** o supervisor continua spawnando `enrich-worker.ts` sem mudança de comportamento
