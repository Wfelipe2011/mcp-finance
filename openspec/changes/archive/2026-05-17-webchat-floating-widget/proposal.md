## Why

Usuários hoje só conseguem consumir insights prontos nas abas do dashboard e não têm um canal direto para tirar dúvidas pontuais em linguagem natural. Um webchat simples no próprio app reduz fricção, aumenta entendimento dos dados e aproveita a infraestrutura de IA já existente.

## What Changes

- Adicionar um balão flutuante de chat no frontend do usuário, fixo no canto inferior direito.
- Ao abrir o chat, exibir mensagem inicial de boas-vindas com convite para pergunta.
- Permitir envio de perguntas e exibição de respostas em uma janela compacta (MVP sem persistência em banco).
- Criar endpoint autenticado para processar pergunta do usuário e retornar resposta curta em português.
- Tratar estados básicos de UX: carregando, erro e fechar/reabrir widget.

## Capabilities

### New Capabilities
- `webchat-widget-ui`: Widget de chat flutuante na interface do usuário com janela compacta, mensagem inicial e troca de mensagens.
- `webchat-response-api`: Endpoint autenticado para receber pergunta do usuário e retornar resposta de IA de forma síncrona.

### Modified Capabilities
- Nenhuma.

## Impact

- `client/src/App.tsx` e novos componentes de chat no frontend do usuário.
- `client/src/api/client.ts` e `client/src/api/types.ts` para contrato da API de chat.
- `src/application/web/router.ts` e nova rota `src/application/web/routes/chat.ts`.
- Novo serviço/agente de chat em `src/infrastructure/ai/` reutilizando `model.ts`.
- Sem mudanças em admin panel, schema de banco ou migrações neste MVP.
