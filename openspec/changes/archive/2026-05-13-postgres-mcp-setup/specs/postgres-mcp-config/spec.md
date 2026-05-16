## ADDED Requirements

### Requirement: Servidor MCP postgres-mcp instalado e configurado no workspace
O sistema SHALL ter `postgres-mcp` (CrystalDBA) instalado globalmente via `pip install postgres-mcp` e configurado no workspace VS Code via `.vscode/mcp.json` com `--access-mode=restricted`, apontando para o banco PostgreSQL financeiro.

#### Scenario: Copilot Agent acessa tools do postgres-mcp
- **WHEN** o GitHub Copilot Agent é ativado no VS Code com o workspace `mcp-finance` aberto
- **THEN** as tools `execute_sql`, `list_schemas`, `list_objects`, `get_object_details`, `explain_query` e `analyze_db_health` estão disponíveis para o agente

#### Scenario: Modo restricted impede escrita
- **WHEN** o agente tenta executar SQL de escrita (INSERT, UPDATE, DELETE, DROP)
- **THEN** o servidor retorna erro e a operação é bloqueada

#### Scenario: Credenciais não versionadas
- **WHEN** o arquivo `.vscode/mcp.json` é inspecionado no repositório git
- **THEN** o arquivo não existe no histórico do git (está no `.gitignore`)
