## ADDED Requirements

### Requirement: endpoint de sync
O servidor deve expor `POST /api/sync` que executa a sincronização completa com a Pluggy.

#### Scenario: sync bem-sucedido
- **WHEN** `POST /api/sync` é chamado com JWT válido
- **THEN** executa `SyncUseCase.run()` e retorna HTTP 200 com `{ items, accounts, transactions, investments, durationMs }`

#### Scenario: sync sem autenticação
- **WHEN** `POST /api/sync` é chamado sem token válido
- **THEN** retorna HTTP 401 (middleware de auth)

#### Scenario: falha de sync
- **WHEN** `SyncUseCase.run()` lança exceção
- **THEN** retorna HTTP 500 com `{ error: "<mensagem>" }`

### Requirement: botão de sync no frontend
O header do app deve ter botão de sync com feedback visual.

#### Scenario: sync em andamento
- **WHEN** usuário clica no botão de sync
- **THEN** botão exibe CircularProgress e fica desabilitado durante a execução (até 120s)

#### Scenario: sync concluído com sucesso
- **WHEN** `POST /api/sync` retorna 200
- **THEN** exibe Snackbar com resumo ("X transações em Xs") e atualiza lista de meses

#### Scenario: sync com erro
- **WHEN** `POST /api/sync` retorna 4xx/5xx ou timeout
- **THEN** exibe Snackbar de erro com a mensagem recebida
