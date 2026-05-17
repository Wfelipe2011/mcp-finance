## ADDED Requirements

### Requirement: Balão de chat flutuante visível na interface do usuário
O sistema SHALL exibir um botão flutuante de chat no canto inferior direito da aplicação do usuário autenticado, permanecendo acessível em qualquer aba de conteúdo.

#### Scenario: Balão exibido após autenticação
- **WHEN** o usuário entra na aplicação com sessão válida
- **THEN** o botão flutuante de chat é exibido no canto inferior direito da tela

#### Scenario: Balão indisponível na tela de login
- **WHEN** o usuário está na tela de login sem sessão válida
- **THEN** o botão flutuante de chat MUST NOT ser exibido

### Requirement: Janela compacta abre e fecha a partir do balão
O sistema SHALL abrir uma janela compacta de chat ao acionar o balão e SHALL permitir fechamento explícito da janela pelo usuário.

#### Scenario: Abrir janela do chat
- **WHEN** o usuário toca/clica no balão flutuante
- **THEN** a janela do chat é aberta acima do balão com área de mensagens e campo de entrada

#### Scenario: Fechar janela do chat
- **WHEN** o usuário aciona o controle de fechar da janela
- **THEN** a janela do chat é ocultada e o balão permanece visível

### Requirement: Mensagem inicial de boas-vindas ao iniciar conversa
Ao abrir o chat sem mensagens anteriores na sessão atual, o sistema SHALL inserir automaticamente uma mensagem do assistente em português com saudação e pergunta de ajuda.

#### Scenario: Primeira abertura na sessão
- **WHEN** o usuário abre o chat pela primeira vez na sessão atual do app
- **THEN** a primeira mensagem exibida é uma saudação do assistente perguntando como pode ajudar

### Requirement: Envio de pergunta e exibição de estados básicos
O sistema SHALL permitir digitar pergunta, enviar para a API de chat e renderizar resposta do assistente, com estado de carregamento e erro amigável.

#### Scenario: Pergunta enviada com sucesso
- **WHEN** o usuário envia uma pergunta válida
- **THEN** a mensagem do usuário é exibida no histórico local
- **AND** o sistema mostra estado de carregamento até receber a resposta
- **AND** a resposta do assistente é exibida na conversa

#### Scenario: Falha na chamada de chat
- **WHEN** a chamada ao endpoint de chat retorna erro ou timeout
- **THEN** o sistema exibe mensagem de erro amigável no chat
- **AND** o usuário pode enviar uma nova pergunta em seguida
