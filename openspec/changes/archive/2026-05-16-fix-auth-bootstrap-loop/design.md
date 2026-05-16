## Context

O cliente React inicializa `selectedMonth` a partir de `localStorage` e hoje dispara `fetchDigest(selectedMonth)` apenas com base nesse valor. Como as chamadas do cliente removem `authToken` e fazem `window.location.reload()` em qualquer `401`, basta existir um mês salvo sem token válido para a SPA entrar em ciclo de recarga. Em paralelo, o formulário de login envia `{ username, password }`, mas a API de tenant login aceita `{ email, password }`.

## Goals / Non-Goals

**Goals:**
- Alinhar o payload do formulário de login ao contrato já exigido pela API.
- Fazer o bootstrap autenticado do app depender de token válido antes de disparar requests protegidos.
- Remover o caminho de recarga infinita quando a sessão estiver ausente, inválida ou expirada.

**Non-Goals:**
- Alterar a política de autenticação do backend para permitir `/api/digest` sem token.
- Redesenhar a UX completa de login ou adicionar refresh token.
- Mudar o payload do JWT ou a semântica de `tenant-login` no servidor.

## Decisions

### D1: O cliente deve tratar a ausência de sessão como estado de UI, não como motivo para `reload`

O caminho primário para sessão ausente/expirada será limpar o token e voltar ao fluxo normal da tela de login sem recarregar a página. `reload()` pode mascarar a origem do problema e amplificar loops quando há efeitos automáticos no bootstrap.

### D2: Requests protegidos no bootstrap devem depender explicitamente de `authToken` válido

Efeitos como `fetchDigest(selectedMonth)` devem verificar autenticação antes de rodar. `selectedMonth` pode continuar persistido, mas não pode ser suficiente para disparar requests protegidos quando o usuário ainda não está autenticado.

### D3: O formulário deve falar a linguagem do backend existente

A API já define `POST /api/auth/login` com `{ email, password }` e essa semântica já está documentada no spec `tenant-login`. A correção mais segura é adaptar o formulário e, se desejado, apenas renomear o label visual para refletir email em vez de “Usuário”.

## Risks / Trade-offs

- [Risco] Pode existir mais de um ponto do cliente tratando `401` com `reload()` → Mitigação: revisar helpers compartilhados e fluxos de sync/update além do `get()` genérico.
- [Risco] Remover `reload()` pode expor estados intermediários mal tratados → Mitigação: usar estado autenticado do `App` como fonte única para renderizar login vs conteúdo.
- [Trade-off] Persistir `selectedMonth` sem limpar no logout mantém conveniência, mas exige guards corretos em todos os efeitos autenticados.
