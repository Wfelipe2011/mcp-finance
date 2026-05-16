## Purpose

Bootstrap autenticado da SPA: validação de token, tratamento de sessão inválida sem ciclos de recarga, e proteção de chamadas autenticadas.

## Requirements

## ADDED Requirements

### Requirement: Bootstrap autenticado não dispara requests protegidos sem token válido
O cliente web SHALL executar chamadas para endpoints protegidos apenas quando existir `authToken` válido no estado da aplicação. Estado persistido não autenticado, como `selectedMonth`, MUST NOT disparar requests autenticados por conta própria.

#### Scenario: Mês persistido sem sessão ativa
- **WHEN** o app inicia com `selectedMonth` salvo e sem `authToken` válido
- **THEN** a tela de login é exibida
- **AND** nenhuma chamada para `/api/digest`, `/api/meses` ou outros endpoints protegidos é disparada antes do login

### Requirement: Sessão inválida volta para login sem ciclo de recarga
Quando uma chamada autenticada receber `401`, o cliente SHALL invalidar a sessão local e voltar ao fluxo de login sem entrar em loop de recarga da página.

#### Scenario: Endpoint protegido responde 401
- **WHEN** uma chamada autenticada retorna `401 Unauthorized`
- **THEN** o cliente remove o token inválido do armazenamento local
- **AND** atualiza a UI para o estado de login
- **AND** MUST NOT chamar `window.location.reload()` em ciclo contínuo

### Requirement: Estado persistido pode sobreviver ao logout sem reativar o loop
O cliente web SHALL permitir que valores persistidos de conveniência, como o mês selecionado, permaneçam armazenados após a sessão ser invalidada, desde que não reativem requests protegidos antes da autenticação.

#### Scenario: selectedMonth permanece salvo após logout
- **WHEN** a sessão é invalidada e `selectedMonth` continua em `localStorage`
- **THEN** o app mantém o valor persistido
- **AND** só volta a usar esse mês em requests protegidos depois de novo login bem-sucedido
