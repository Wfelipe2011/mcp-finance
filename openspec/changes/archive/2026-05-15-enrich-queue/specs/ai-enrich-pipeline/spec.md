## MODIFIED Requirements

### Requirement: Pipeline enriquece transações via worker em background
O sistema SHALL processar transações via worker loop em background (processo Bun gerenciado pelo supervisor), não via script CLI. O worker SHALL buscar jobs da tabela `enrich_jobs` usando `nextJob()`, processar uma transação por vez chamando o modelo AI configurado nas env vars do processo, e persistir o resultado via `markDone()`. A ordenação SHALL ser `date DESC` (mais recente primeiro) com sorteio de tenant para fairness.

#### Scenario: Worker processa transação nova
- **WHEN** o worker está ativo e há jobs `pending` em `enrich_jobs`
- **THEN** o worker busca o job mais recente de um tenant sorteado, chama o modelo AI e persiste o resultado em `ai_transaction_insights`

#### Scenario: Worker está ativo sem jobs na fila
- **WHEN** não há jobs `pending` em `enrich_jobs`
- **THEN** o worker aguarda 5 segundos e tenta de novo, sem consumir recursos significativos

#### Scenario: Worker processa transações de múltiplos tenants
- **WHEN** múltiplos tenants têm jobs pendentes e N workers estão ativos
- **THEN** cada worker sorteia um tenant diferente a cada iteração, garantindo que todos os tenants progridam

## REMOVED Requirements

### Requirement: Pipeline enriquece transações não-analisadas uma por chamada (CLI)
**Reason**: O script CLI `bun run enrich --limit N` é descontinuado. O processamento agora é automático via worker loop após o sync.
**Migration**: Remover `src/scripts/enrich.ts` e o script `enrich` do `package.json`. Workers gerenciados pelo supervisor substituem a execução manual.

### Requirement: Script loga progresso em tempo real
**Reason**: Substituído pelo logging do worker loop com `worker_id` e `job_id` no contexto.
**Migration**: Logs do worker são emitidos via stdout do processo filho, capturados pelo supervisor.

### Requirement: Pipeline respeita o parâmetro --limit
**Reason**: Parâmetro `--limit` era específico do script CLI. Workers processam um job por vez em loop contínuo.
**Migration**: N/A — o paralelismo agora é controlado pelo número de workers ativos.
