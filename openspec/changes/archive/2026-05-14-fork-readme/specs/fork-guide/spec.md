## ADDED Requirements

### Requirement: README orientado ao fork
O `README.md` deve permitir que qualquer pessoa configure e suba o projeto sem conhecimento prévio do código.

#### Scenario: novo usuário lê o README
- **WHEN** alguém clona o repo e lê o README
- **THEN** consegue subir o projeto completo seguindo apenas as instruções documentadas, sem precisar abrir nenhum arquivo de código

#### Scenario: usuário configura o .env
- **WHEN** o usuário copia `.env.example` para `.env`
- **THEN** o README explica o propósito de cada variável e como obter seu valor
