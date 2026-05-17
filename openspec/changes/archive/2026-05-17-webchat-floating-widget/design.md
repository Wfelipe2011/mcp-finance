## Context

O frontend do usuário em `client/src/App.tsx` usa navegação por abas fixas e já está no limite de densidade visual em mobile. Adicionar uma nova aba para chat aumentaria complexidade de navegação e reduziria área útil de toque. Ao mesmo tempo, o backend já possui infraestrutura de IA (`src/infrastructure/ai/model.ts`) e padrão de endpoints autenticados por tenant (`/api/*` com JWT), permitindo introduzir um chat simples com baixo custo técnico.

Este change propõe um MVP de chat contextual: balão flutuante sempre disponível, janela compacta com boas-vindas e fluxo de pergunta-resposta curto, sem persistência em banco nesta fase.

## Goals / Non-Goals

**Goals:**
- Disponibilizar um ponto de contato conversacional sem alterar a navegação principal por abas.
- Implementar experiência mínima e clara: abrir/fechar widget, mensagem de boas-vindas, enviar pergunta, receber resposta.
- Reutilizar autenticação e stack de IA já existentes, mantendo isolamento por tenant.
- Manter implementação enxuta, sem migração de banco.

**Non-Goals:**
- Histórico persistente entre sessões ou sincronizado entre dispositivos.
- Chat avançado com streaming token-by-token, anexos, comandos ou ferramentas.
- Escopo administrativo, supervisão de chat ou painel de analytics.
- Alterações de schema SQL ou novas tabelas para mensagens neste MVP.

## Decisions

### Widget flutuante em vez de nova aba

**Decisão:** usar botão flutuante (`FAB`) fixo no canto inferior direito que abre uma janela compacta (`Paper`/`Popper`).

**Alternativas consideradas:**
- Nova aba no `BottomNavigation` (descartada por piorar usabilidade em tela pequena).
- Modal full-screen (descartado para manter chat como apoio e não fluxo principal).

**Rationale:** o widget preserva a estrutura atual do app e reduz impacto visual, além de ser consistente com requisito de "não muito sofisticado".

### MVP stateless no frontend

**Decisão:** manter mensagens apenas em estado local do componente enquanto o app está aberto. Não persistir conversa em banco nem em localStorage.

**Alternativas consideradas:**
- Persistência local em `localStorage`.
- Persistência server-side com tabela dedicada.

**Rationale:** simplifica implementação inicial, elimina migração e permite validar utilidade do recurso antes de investir em memória longa.

### Endpoint dedicado `POST /api/chat`

**Decisão:** criar endpoint autenticado específico para chat no web server, com payload simples (`message`, `history`) e resposta direta (`reply`).

**Alternativas consideradas:**
- Reaproveitar endpoint de previsão/digest (descartado por semântica incorreta).
- Expor chat via MCP apenas (descartado porque frontend web precisa API HTTP direta).

**Rationale:** contrato explícito facilita evolução futura (persistência, limite, telemetria) sem acoplar com features de forecast/digest.

### Resposta curta e segura por prompt

**Decisão:** criar agente/serviço de chat com instruções para respostas curtas em português, com escopo financeiro familiar e fallback seguro quando faltar contexto.

**Alternativas consideradas:**
- Resposta longa e analítica por padrão.
- Prompt livre sem restrição de estilo.

**Rationale:** respostas curtas melhoram UX de widget compacto e reduzem risco de alucinação extensa.

## Risks / Trade-offs

- [Resposta genérica ou pouco útil] → Mitigar com prompt objetivo e fornecimento de histórico curto recente.
- [Janela sobrepor controles em mobile] → Definir largura/altura máximas e respeitar espaço da bottom bar.
- [Latência perceptível] → Exibir estado "respondendo..." e timeout com mensagem de erro amigável.
- [Sem persistência pode frustrar retorno do usuário] → Assumido no MVP; avaliar persistência em fase seguinte se adoção justificar.

## Migration Plan

Sem migração de banco. Deploy incremental:
1. Subir endpoint `POST /api/chat`.
2. Subir widget de frontend consumindo endpoint.
3. Validar manualmente fluxos de login, abertura/fechamento, pergunta/resposta e erro.

Rollback: remover rota e componente do widget sem impacto em dados persistidos.

## Open Questions

- O chat deve receber contexto do mês selecionado (`selectedMonth`) já no MVP?
- Haverá limite de perguntas por minuto por tenant nesta primeira versão?
- O texto de boas-vindas será fixo ou configurável por ambiente?
