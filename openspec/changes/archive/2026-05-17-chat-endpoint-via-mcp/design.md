## Context

O webchat do app já está integrado ao endpoint `POST /api/chat` no servidor web (`3001`), mas a resposta hoje depende de geração direta via LangChain/modelo em `src/infrastructure/ai/`. Em paralelo, a aplicação já opera um servidor MCP em `3002` com catálogo de tools financeiras por tenant e validações consolidadas.  
O objetivo deste change é preservar a API pública do chat para o frontend e trocar apenas a estratégia interna de resposta, passando a usar MCP + naturalização determinística.

Restrições relevantes:
- Não quebrar o contrato atual do widget (`message`, `history`, `reply`).
- Reutilizar autenticação de tenant existente no web server.
- Limitar escopo inicial a 2-3 intents para reduzir risco e acelerar validação.

## Goals / Non-Goals

**Goals:**
- Manter `POST /api/chat` no web server como ponto único de integração do frontend.
- Introduzir cliente MCP interno para chamada HTTP JSON-RPC ao serviço em `3002`.
- Implementar roteamento inicial de intenção para no máximo 3 tools MCP.
- Converter resposta estruturada das tools em texto curto, claro e acionável em português.
- Garantir tratamento explícito de timeout, indisponibilidade do MCP e erro de parse com fallback amigável.

**Non-Goals:**
- Alterar o widget de chat no frontend ou adicionar novas interações visuais.
- Cobrir todo o catálogo MCP no primeiro ciclo.
- Reintroduzir geração aberta por LLM para “embelezar” respostas neste MVP.
- Implementar memória persistente, rankeamento semântico avançado ou orchestration multi-tool.

## Decisions

### Manter `/api/chat` como fachada estável
**Decisão:** o frontend continuará chamando apenas o endpoint web existente; a migração será interna ao backend.  
**Alternativas consideradas:** expor MCP direto ao frontend; criar novo endpoint `/api/chat/mcp`.  
**Rationale:** minimiza impacto no client, reduz risco de regressão e permite rollback rápido no servidor.

### Criar cliente MCP dedicado na infraestrutura web
**Decisão:** encapsular protocolo JSON-RPC MCP em um cliente (`McpClient`) no backend web, com timeout e validação de formato de resposta.  
**Alternativas consideradas:** chamadas `fetch` diretas no handler de rota; acoplamento de protocolo dentro do orquestrador.  
**Rationale:** separa responsabilidades, facilita testes unitários e simplifica evolução para retries/circuit breaker.

### Orquestração por intents determinísticas (2-3 intents)
**Decisão:** detectar intenção por palavras-chave e mapear para tools específicas (`get_monthly_balance`, `get_subscription_analysis`, `get_credit_card_status` ou `get_anomalous_transactions`).  
**Alternativas consideradas:** roteamento por LLM; chamar múltiplas tools por pergunta.  
**Rationale:** comportamento previsível, custo baixo, fácil observabilidade e resposta rápida para MVP.

### Naturalização sem LLM no primeiro ciclo
**Decisão:** transformar payload MCP em frases curtas por templates de domínio (no máximo 2-3 frases).  
**Alternativas consideradas:** pós-processamento com LLM; retorno bruto em JSON textual.  
**Rationale:** evita dependência externa adicional, reduz alucinação e mantém controle de linguagem.

### Fallback seguro e observabilidade mínima
**Decisão:** quando intent não for reconhecida ou houver erro em MCP, responder com mensagem curta orientando tipos de perguntas suportadas e registrar logs sem conteúdo sensível.  
**Alternativas consideradas:** propagar erro técnico ao usuário; retornar 500 para toda falha de domínio.  
**Rationale:** melhora UX, preserva privacidade e facilita suporte operacional.

## Risks / Trade-offs

- [Cobertura limitada de intents no início] → Mitigar com mensagem de fallback clara e backlog de expansão incremental.
- [Heurística de palavras-chave classificar pergunta errada] → Mitigar com regras simples e teste de frases reais antes de ampliar escopo.
- [Timeout no MCP degradar experiência] → Mitigar com timeout explícito, resposta amigável e logs de latência.
- [Mudança de formato de payload da tool quebrar naturalização] → Mitigar com parse defensivo e fallback de serialização resumida.
- [Dependência extra de serviço local `3002`] → Mitigar com healthcheck, configuração de `MCP_BASE_URL` e estratégia de rollback.

## Migration Plan

1. Introduzir cliente MCP e orquestrador no backend web sem alterar rota pública.
2. Atualizar `POST /api/chat` para usar orquestrador MCP, mantendo validações de entrada atuais.
3. Validar manualmente os 3 cenários-alvo (saldo, assinaturas, cartão/anomalias) e cenários de falha.
4. Publicar em ambiente de desenvolvimento com logs monitorados.
5. Rollback: reverter handler para fluxo anterior sem alterar contrato do frontend.

## Open Questions

- Qual terceira intent terá prioridade no MVP: `status de cartão` ou `anomalias`?
- O range temporal padrão para perguntas de saldo deve ser mês corrente fixo ou derivado da pergunta quando possível?
- Precisamos incluir feature flag para alternar entre implementação antiga e MCP durante rollout inicial?
