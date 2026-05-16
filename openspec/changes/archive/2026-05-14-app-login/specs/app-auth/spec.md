## ADDED Requirements

### Requirement: endpoint de login
O servidor deve expor `POST /api/auth/login` que autentica com credenciais do `.env`.

#### Scenario: credenciais corretas
- **WHEN** `POST /api/auth/login { username, password }` com credenciais válidas
- **THEN** retorna HTTP 200 com `{ token: "<jwt>", expiresAt: "<iso>" }`

#### Scenario: credenciais incorretas
- **WHEN** `POST /api/auth/login` com username ou password errado
- **THEN** retorna HTTP 401 com `{ error: "Credenciais inválidas" }` após tempo constante (timing-safe)

### Requirement: middleware de proteção da API
Todos os endpoints `/api/*` exceto `/api/auth/login` devem exigir JWT válido.

#### Scenario: requisição sem token
- **WHEN** qualquer `/api/*` (exceto login) recebe requisição sem `Authorization` header
- **THEN** retorna HTTP 401

#### Scenario: token expirado
- **WHEN** `Authorization: Bearer <jwt_expirado>` é enviado
- **THEN** retorna HTTP 401

#### Scenario: token válido
- **WHEN** `Authorization: Bearer <jwt_valido>` é enviado
- **THEN** a requisição é processada normalmente

### Requirement: tela de login no frontend
O frontend deve mostrar tela de login quando não há token válido.

#### Scenario: sem token no localStorage
- **WHEN** o app carrega e `authToken` não está no localStorage
- **THEN** exibe tela de login (sem o app completo)

#### Scenario: login bem-sucedido
- **WHEN** usuário submete credenciais corretas na tela de login
- **THEN** salva token em localStorage e exibe o app completo

#### Scenario: token expirado detectado no frontend
- **WHEN** o app carrega e o payload do JWT indica `exp` no passado
- **THEN** remove o token e exibe tela de login

### Requirement: Authorization header em todas as chamadas
O cliente HTTP deve enviar o token em todas as chamadas à API.

#### Scenario: chamada à API com token
- **WHEN** qualquer função em `client.ts` faz fetch para `/api/*`
- **THEN** inclui `Authorization: Bearer <token>` no header

#### Scenario: servidor retorna 401
- **WHEN** qualquer fetch recebe HTTP 401
- **THEN** limpa o token do localStorage e recarrega a página
