## MODIFIED Requirements

### Requirement: Supervisor Bun gerencia processos filhos por delta
O sistema SHALL ter `src/application/supervisor/supervisor.ts` que ao iniciar le todos os workers com `status IN ('idle', 'busy')` e os spawna como processos Bun filhos via `Bun.spawn()`. Cada processo filho SHALL executar um worker compartilhado apto a consumir multiplas filas (enrich, digest e forecast). A cada 10 minutos reconcilia: spawna novos workers ativos, mata processos de workers removidos/inativos.

#### Scenario: Novo worker cadastrado
- **WHEN** um worker esta ativo e o supervisor executa o proximo reconcile
- **THEN** o supervisor spawna um processo filho com env vars do worker (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `WORKER_ID`, `DATABASE_URL`)
- **THEN** o processo iniciado pode consumir jobs de enrich, digest e forecast

#### Scenario: Worker desativado pelo admin
- **WHEN** um worker sai do status `idle|busy` e o supervisor executa o proximo reconcile
- **THEN** o supervisor mata o processo filho correspondente

### Requirement: Auto-deactivacao por crashes em serie
O sistema SHALL detectar quando um processo filho sai com codigo nao-zero, incrementar `workers.error_count`. Quando `error_count >= 5`, SHALL atualizar `workers.status = 'error'` e nao reiniciar o processo.

#### Scenario: Worker crasha uma vez
- **WHEN** um processo filho sai com codigo nao-zero e `error_count < 5`
- **THEN** `error_count` e incrementado; o worker e elegivel para respawn no proximo reconcile

#### Scenario: Worker crasha 5 vezes
- **WHEN** `error_count` atinge 5
- **THEN** `workers.status = 'error'`; o worker nao e mais reiniciado ate o admin resetar para `idle`

## ADDED Requirements

### Requirement: Selecao de fila por rotacao no worker compartilhado
O worker compartilhado SHALL aplicar politica de rotacao entre tipos de fila suportados para evitar starvation, com fallback para a proxima fila disponivel quando a fila corrente estiver vazia.

#### Scenario: Rotacao com multiplas filas pendentes
- **WHEN** existem jobs pendentes em duas ou mais filas
- **THEN** o worker alterna o tipo de fila priorizado entre iteracoes consecutivas

#### Scenario: Fallback quando fila priorizada esta vazia
- **WHEN** a fila da vez na rotacao nao possui jobs pendentes
- **THEN** o worker tenta claimar na proxima fila da rotacao sem encerrar o loop
