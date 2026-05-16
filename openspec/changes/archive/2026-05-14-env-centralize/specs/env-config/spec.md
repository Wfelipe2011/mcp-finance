## ADDED Requirements

### Requirement: arquivo de configuração canônico
Deve existir um arquivo `.env.example` na raiz do projeto cobrindo todas as variáveis de ambiente necessárias para subir o projeto completo via `docker compose up`.

#### Scenario: usuário faz fork e copia .env.example
- **WHEN** o usuário copia `.env.example` para `.env` e preenche os valores indicados
- **THEN** `docker compose up -d` deve subir todos os serviços sem erros de variável ausente

---

### Requirement: TOKEN_URL configurável
O serviço de token deve ser configurável via variável de ambiente, sem nenhum IP hardcoded no código.

#### Scenario: execução via docker compose
- **WHEN** `TOKEN_URL` não está definida no `.env`
- **THEN** o adapter usa `http://auth:3000/token` como default (nome do container no compose)

#### Scenario: execução local fora do compose
- **WHEN** `TOKEN_URL=http://localhost:3000/token` está no `.env`
- **THEN** o adapter conecta ao serviço auth local na porta 3000
