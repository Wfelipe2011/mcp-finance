## ADDED Requirements

### Requirement: Execução da migração SHALL incluir validação visual incremental via MCP browser tools
O processo de migração SHALL executar validação visual ao final de cada onda usando `open_browser_page`, `read_page` e `screenshot_page`.

#### Scenario: Evidência visual por onda
- **WHEN** uma onda de migração é concluída
- **THEN** ao menos uma captura de tela e uma leitura de estado da página são realizadas para as abas impactadas

#### Scenario: Navegação básica validada
- **WHEN** a validação MCP é executada
- **THEN** o fluxo de navegação entre abas impactadas é testado por interação real no browser

### Requirement: Execução SHALL bloquear avanço em caso de erro de runtime
O processo de migração SHALL interromper avanço de ondas quando erros de runtime forem observados no browser durante validação MCP.

#### Scenario: Erro detectado durante validação
- **WHEN** um erro de runtime aparece ao navegar nas abas impactadas
- **THEN** a onda é considerada reprovada e requer correção antes da próxima onda

### Requirement: Validação final SHALL incluir smoke test em ambiente publicado
O processo SHALL incluir validação final no ambiente publicado com browser tools após deploy da mudança.

#### Scenario: Smoke test de produção
- **WHEN** o deploy da migração for concluído
- **THEN** as 6 abas carregam sem crash e sem erro crítico de renderização
