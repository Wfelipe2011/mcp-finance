## Purpose
Define background enrichment worker behavior and resilience guarantees.

## Requirements

### Requirement: Pipeline enriquece transacoes via worker em background
O sistema SHALL processar transacoes via worker loop em background (processo Bun gerenciado pelo supervisor), nao via script CLI. O worker SHALL buscar jobs da tabela `enrich_jobs` usando `nextJob()`, processar uma transacao por vez chamando o modelo AI configurado nas env vars do processo, e persistir o resultado via `markDone()`. A ordenacao SHALL ser `date DESC` (mais recente primeiro) com sorteio de tenant para fairness.

#### Scenario: Worker processa transacao nova
- **WHEN** o worker esta ativo e ha jobs `pending` em `enrich_jobs`
- **THEN** o worker busca o job mais recente de um tenant sorteado, chama o modelo AI e persiste o resultado em `ai_transaction_insights`

#### Scenario: Worker esta ativo sem jobs na fila
- **WHEN** nao ha jobs `pending` em `enrich_jobs`
- **THEN** o worker aguarda 5 segundos e tenta de novo, sem consumir recursos significativos

#### Scenario: Worker processa transacoes de multiplos tenants
- **WHEN** multiplos tenants tem jobs pendentes e N workers estao ativos
- **THEN** cada worker sorteia um tenant diferente a cada iteracao, garantindo que todos os tenants progridam

### Requirement: Campo `is_debt_related` e sempre preenchido pelo modelo
O sistema SHALL incluir `is_debt_related` como campo obrigatorio (nao-nullable) no schema de saida do modelo. O prompt SHALL instruir explicitamente o modelo a detectar depositos de emprestimo, amortizacoes e movimentacoes de divida.

#### Scenario: Transacao de emprestimo e marcada corretamente
- **WHEN** a description contem indicativos de emprestimo (ex: "Deposito de emprestimo", "Amortizacao")
- **THEN** `is_debt_related = true` na linha inserida em `ai_transaction_insights`

#### Scenario: Transacao de consumo comum nao e marcada como divida
- **WHEN** a description e de um gasto ordinario (ex: "Supermercado Extra", "Netflix")
- **THEN** `is_debt_related = false` na linha inserida

#### Scenario: Log emitido apos cada transacao
- **WHEN** uma transacao e processada com sucesso
- **THEN** o stdout exibe linha no formato `✓ [N/total] <description> -> merchant=<name> debt=<bool>`

### Requirement: Erro do modelo nao interrompe o pipeline inteiro
- **WHEN** o modelo retorna resposta invalida ou a chamada HTTP falha para uma transacao
- **THEN** o script loga o erro para aquela transacao, incrementa contador de erros, e continua para a proxima
- **THEN** ao final, exibe resumo com `processed_count` e `error_count`

### Requirement: Tabela `workers` tem coluna `kind` para distinguir tipo de worker
O sistema SHALL adicionar coluna `kind TEXT NOT NULL DEFAULT 'enrich' CHECK (kind IN ('enrich', 'digest', 'forecast'))` a tabela `workers`. O supervisor SHALL usar `kind` para escolher o script a spawnar por processo filho.

#### Scenario: Supervisor spawna enrich-worker para kind='enrich'
- **WHEN** ha um worker com `kind='enrich'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/enrich-worker.ts` para esse worker

#### Scenario: Supervisor spawna digest-worker para kind='digest'
- **WHEN** ha um worker com `kind='digest'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/digest-worker.ts` para esse worker

#### Scenario: Supervisor spawna forecast-worker para kind='forecast'
- **WHEN** ha um worker com `kind='forecast'` e `status IN ('idle', 'busy')` na tabela
- **THEN** o supervisor spawna `src/application/workers/forecast-worker.ts` para esse worker

#### Scenario: Workers existentes (kind='enrich') nao sao afetados
- **WHEN** ha workers existentes sem `kind` explicito (DEFAULT 'enrich')
- **THEN** o supervisor continua spawnando `enrich-worker.ts` sem mudanca de comportamento
