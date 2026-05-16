## ADDED Requirements

### Requirement: Imagem Docker multi-stage empacota client e server
O sistema SHALL ter um `Dockerfile` na raiz com dois stages: `client-builder` que executa o build Vite do React, e `server` que copia o bundle gerado e empacota o Bun HTTP server. O resultado SHALL ser uma imagem self-contained.

#### Scenario: Build da imagem bem-sucedido
- **WHEN** desenvolvedor executa `docker build -t mcp-finance .` na raiz do projeto
- **THEN** imagem é criada sem erros, contendo `client/dist/` e `src/application/web/`

#### Scenario: Stage 1 instala dependências do client isoladamente
- **WHEN** imagem é buildada
- **THEN** `bun install` do client é executado com `client/package.json` antes de copiar o código-fonte, maximizando cache Docker

#### Scenario: Stage 2 instala dependências do server em modo production
- **WHEN** stage 2 é executado
- **THEN** `bun install --production` instala apenas dependências de runtime (sem devDependencies)

#### Scenario: Bundle do client presente na imagem final
- **WHEN** imagem final é inspecionada
- **THEN** arquivos de `client/dist/` estão em `/app/client/dist/` dentro do container

#### Scenario: Imagem executa o Bun server como CMD
- **WHEN** container é iniciado sem comando customizado
- **THEN** executa `bun run src/application/web/server.ts` escutando na porta 3001
