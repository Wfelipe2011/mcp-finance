## Why

O sistema de análise de dados financeiros não tem nenhuma interface de consulta acessível para agentes de IA. Com o Postgres agora como banco de dados, podemos conectar um servidor MCP genérico (`postgres-mcp` da CrystalDBA) para permitir que o GitHub Copilot Agent explore, consulte e anote descobertas sobre os dados financeiros diretamente durante sessões de desenvolvimento.

## What Changes

- **ADDED** Instalação global de `postgres-mcp` via `pip`
- **ADDED** Configuração MCP no workspace (`.vscode/mcp.json`) apontando para o Postgres financeiro em modo read-only (`--access-mode=restricted`)
- **ADDED** Arquivo de contexto semântico (`docs/finance-context.md`) como memória de longo prazo: descreve domínio, schema, categorias, campos relevantes e descobertas anotadas pelo agente ao longo do tempo
- **ADDED** Instruções no `README.md` do workspace sobre como usar o MCP com o Copilot

## Capabilities

### New Capabilities

- `postgres-mcp-config`: Configuração do servidor MCP `crystaldba/postgres-mcp` no workspace VS Code (`.vscode/mcp.json`), com credenciais via variável de ambiente, modo restricted, e instalação via `pip install postgres-mcp`
- `finance-context`: Arquivo de contexto semântico persistente (`docs/finance-context.md`) que serve como memória de longo prazo para agentes — documenta o domínio financeiro, o schema de dados, o significado de campos e categorias, e acumula descobertas ao longo do tempo

### Modified Capabilities

## Impact

- Novo arquivo `.vscode/mcp.json` (não versionado — contém referência à `DATABASE_URI`)
- Novo arquivo `docs/finance-context.md` (versionado — memória semântica do domínio)
- Dependência nova no sistema: `postgres-mcp` instalado globalmente via `pip`
- `README.md` atualizado com instruções de uso
- Sem impacto em `src/`, `sync.ts`, `BunPgAdapter`, ou qualquer código de produção
