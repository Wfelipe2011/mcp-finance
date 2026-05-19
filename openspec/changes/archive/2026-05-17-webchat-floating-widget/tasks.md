## 1. Estrutura de tipos e API de chat no client

- [x] 1.1 Adicionar tipos de chat em `client/src/api/types.ts` (mensagem do chat, payload de request e response)
- [x] 1.2 Adicionar função `postChatMessage` em `client/src/api/client.ts` com `POST /api/chat` usando `Authorization` existente
- [x] 1.3 Garantir tratamento de erro padronizado no client para falhas do endpoint de chat

## 2. Widget flutuante no frontend do usuário

- [x] 2.1 Criar componente `client/src/components/ChatWidget.tsx` com botão flutuante fixo no canto inferior direito
- [x] 2.2 Implementar janela compacta de chat com cabeçalho, lista de mensagens, input e botão enviar
- [x] 2.3 Inserir mensagem inicial de boas-vindas na primeira abertura do chat na sessão atual
- [x] 2.4 Implementar estados de UX no componente (respondendo, erro amigável, fechar/reabrir)
- [x] 2.5 Integrar `ChatWidget` em `client/src/App.tsx` apenas no estado autenticado (não exibir na tela de login)

## 3. Endpoint web de chat no servidor

- [x] 3.1 Criar rota `src/application/web/routes/chat.ts` com handler de `POST /api/chat`
- [x] 3.2 Validar payload de entrada (`message` obrigatório string não vazia, `history` opcional)
- [x] 3.3 Criar serviço/agente em `src/infrastructure/ai/` para gerar resposta curta em português reutilizando `model.ts`
- [x] 3.4 Registrar `POST /api/chat` em `src/application/web/router.ts` no bloco de rotas autenticadas de usuário
- [x] 3.5 Retornar respostas e erros no formato JSON consistente com helpers web

## 4. Validação e checklist de aceite

- [x] 4.1 Executar build do frontend (`cd client && bun run build`) e corrigir erros de TypeScript
- [x] 4.2 Executar validação do backend (`bun run check` ou comando equivalente do projeto) e corrigir erros
- [x] 4.3 Validar manualmente fluxo: login, abrir chat, mensagem inicial, pergunta com sucesso e cenário de erro
- [x] 4.4 Confirmar que nenhuma tela/admin rota foi alterada fora do escopo do widget de usuário
