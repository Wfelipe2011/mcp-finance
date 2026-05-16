## Why

A sessao de discovery confirmou que o produto ja possui dados, cubos, endpoints e pipeline suficientes para um servidor MCP util, mas hoje nao existe um servidor MCP operacional no runtime para expor essas capacidades de forma padronizada para agentes. Este change prioriza transformar esse valor ja existente em um catalogo de tools tenant-safe, com contrato claro e foco em perguntas reais dos usuarios.

## What Changes

- Reintroduzir um servidor MCP HTTP para o backend atual em PostgreSQL, com registro de tools e validacao de input por schema.
- Evoluir o conjunto atual de tools MCP para um catalogo de 12 tools orientadas a casos reais de analise financeira, investigacao e operacao.
- Padronizar o contrato multi-tenant para todas as tools (tenant_id obrigatorio quando nao houver contexto autenticado, validacao de tenant, e scoping via app.tenant_id).
- Definir respostas estruturadas e consistentes para erros de validacao e erros de execucao de tool (isError true).
- Cobrir tools de dados financeiros, tools de status AI/forecast e tools de saude de pipeline no mesmo pacote funcional.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- mcp-server: atualizar requisitos para servidor MCP HTTP no stack PostgreSQL atual, com modelo de seguranca tenant-safe e registro de tools orientadas a analytics.
- mcp-view-tools: substituir e expandir o contrato atual para um catalogo de 12 tools com inputs, outputs e validacoes alinhados ao discovery.

## Impact

- Affected specs:
  - openspec/specs/mcp-server/spec.md
  - openspec/specs/mcp-view-tools/spec.md
- Affected code (expected):
  - src/scripts/mcp.ts (novo entrypoint)
  - src/application/mcp/* (registro de tools, validacao e tratamento de erros)
  - src/infrastructure/db/BunPgAdapter.ts (reuse de queries existentes e possiveis metodos novos)
- APIs/systems:
  - Novo endpoint MCP HTTP (porta configuravel por env)
  - Consumo direto de views/tabelas existentes no PostgreSQL com isolamento por tenant
- Dependencies:
  - @modelcontextprotocol/server (ou equivalente suportado no projeto)
  - zod para input/output schema das tools
