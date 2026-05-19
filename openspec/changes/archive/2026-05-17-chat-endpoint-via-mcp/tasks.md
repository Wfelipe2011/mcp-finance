## 0. Guardrails de escopo (não alterar projeto MCP)

- [x] 0.1 Manter este change restrito ao consumo do MCP pelo servidor web, sem alterar implementação interna do servidor MCP
- [x] 0.2 MUST NOT modificar arquivos em `src/application/mcp/*` e `src/scripts/mcp.ts` neste change
- [x] 0.3 Em caso de limitação funcional no MCP atual, registrar gap e fallback no web chat sem introduzir mudanças no projeto MCP

## 1. Base de integração MCP no servidor web

- [x] 1.1 Definir configuração de conexão MCP no backend web (ex.: `MCP_BASE_URL`, timeout padrão e defaults para ambiente local)
- [x] 1.2 Criar/ajustar cliente MCP em `src/infrastructure/mcp/McpClient.ts` para envio de `tools/call` via JSON-RPC com tratamento de erros de rede
- [x] 1.3 Implementar parse defensivo do retorno MCP (`content[].text`) e normalizar erros técnicos em exceções de domínio
- [x] 1.4 Cobrir `McpClient` com testes unitários para sucesso, timeout, resposta malformada e erro retornado pela tool

## 2. Orquestração por intents (MVP 2-3 intents)

- [x] 2.1 Definir matriz de intents suportadas no MVP (saldo mensal, assinaturas e terceira intent escolhida: cartão ou anomalias)
- [x] 2.2 Implementar detecção determinística de intent por palavras-chave, com prioridade e fallback explícito para intent não reconhecida
- [x] 2.3 Mapear cada intent para tool MCP e montar argumentos obrigatórios (`tenant_id`, datas/ranges padrão e limites)
- [x] 2.4 Implementar naturalização por template para cada intent (respostas curtas em pt-BR, no máximo 3 frases)
- [x] 2.5 Garantir fallback seguro para payload inesperado sem expor JSON bruto, stacktrace ou detalhes internos

## 3. Migração do endpoint `POST /api/chat`

- [x] 3.1 Atualizar `src/application/web/routes/chat.ts` para trocar chamada LangChain direta pela orquestração MCP mantendo contrato atual (`message`, `history`, `reply`)
- [x] 3.2 Preservar validações existentes de entrada (`message` obrigatório, `history` opcional válido) e padronizar respostas 400/500
- [x] 3.3 Propagar `tenantId` autenticado para a orquestração MCP sem aceitar `tenant_id` vindo do body do cliente
- [x] 3.4 Revisar logs do fluxo para registrar apenas metadados operacionais (latência, intent, erro) sem conteúdo sensível da conversa

## 4. Remoção de acoplamento com IA direta no chat

- [x] 4.1 Remover dependência funcional do endpoint de chat em `chatAgent.ts` e `model.ts` neste caminho de execução
- [x] 4.2 Verificar se imports/arquivos legados do chat por LangChain podem ser descontinuados sem afetar outros módulos
- [x] 4.3 Atualizar documentação técnica mínima do fluxo de chat para refletir “web 3001 -> MCP 3002 -> naturalização”

## 5. Testes de regressão e qualidade

- [x] 5.1 Criar testes unitários do orquestrador para cada intent suportada com amostras reais de payload MCP
- [x] 5.2 Criar testes de integração do endpoint `/api/chat` cobrindo sucesso, fallback de intent desconhecida e falha de MCP
- [x] 5.3 Validar que o frontend continua compatível sem mudanças no contrato da API (widget envia e recebe os mesmos campos)
- [x] 5.4 Executar suíte de checks do backend e corrigir eventuais erros de lint/tipagem antes de concluir

## 6. Validação funcional e aceite

- [x] 6.1 Testar manualmente conversa com pergunta de saldo mensal e confirmar resposta curta e objetiva
- [x] 6.2 Testar manualmente conversa com pergunta de assinaturas e confirmar leitura correta da tool correspondente
- [x] 6.3 Testar manualmente terceira intent escolhida e registrar comportamento esperado para casos limítrofes
- [x] 6.4 Simular indisponibilidade do MCP (porta 3002) e confirmar mensagem de erro amigável sem quebra do frontend
- [x] 6.5 Confirmar que o change está apply-ready e sem alterações fora de escopo, incluindo ausência de mudanças em `src/application/mcp/*` e `src/scripts/mcp.ts`
