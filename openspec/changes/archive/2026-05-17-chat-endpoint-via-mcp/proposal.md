## Why

O endpoint `POST /api/chat` do webchat hoje depende de chamada direta ao modelo via LangChain, fluxo que não estabilizou e gera risco operacional para o MVP. Como a aplicação já possui um servidor MCP dedicado na porta `3002` com ferramentas financeiras por tenant, migrar a orquestração do chat para esse MCP reduz acoplamento com LLM direto e melhora previsibilidade das respostas.

## What Changes

- Manter o contrato atual do frontend com `POST /api/chat` no servidor web (`3001`) sem breaking change para o widget.
- Alterar a implementação interna do endpoint de chat para chamar o servidor MCP (`3002`) via cliente HTTP JSON-RPC.
- Introduzir orquestração inicial por intenção com escopo de 2-3 intents (saldo mensal, assinaturas e status de cartão/anomalias).
- Naturalizar o retorno estruturado das tools MCP em resposta curta e acionável em português para o usuário final.
- Padronizar tratamento de timeout/erro de MCP no endpoint para fallback amigável e sem vazamento de detalhes internos.
- Remover dependência funcional do fluxo de resposta do chat em LangChain/modelo direto para este caminho.

## Capabilities

### New Capabilities
- `webchat-mcp-orchestration`: Camada de orquestração do chat que detecta intents, chama tools MCP em `3002` com `tenant_id` e transforma payload técnico em texto de resposta para o usuário.

### Modified Capabilities
- `webchat-response-api`: A capacidade de resposta do endpoint `/api/chat` passa a ser baseada em MCP (com naturalização) em vez de geração direta por modelo via LangChain.

## Impact

- Backend web: `src/application/web/routes/chat.ts` e serviços de infraestrutura para cliente MCP/orquestração.
- Infraestrutura MCP: consumo das tools já registradas em `src/application/mcp/register-tools.ts` através do endpoint `/mcp`.
- Configuração de ambiente: necessidade de endpoint MCP configurável no web server (ex.: `MCP_BASE_URL` com default local).
- Observabilidade e suporte: novos cenários de erro (timeout, tool inválida, falha de parse) e fallback padronizado no chat.
