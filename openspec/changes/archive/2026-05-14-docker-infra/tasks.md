## 1. Pré-requisitos (garantir lockfiles existem)

- [x] 1.1 Rodar `bun install` na raiz do projeto para garantir que `bun.lockb` existe
- [x] 1.2 Rodar `cd client && bun install` para garantir que `client/bun.lockb` existe
- [x] 1.3 Confirmar que `client/package.json` tem script `"build": "vite build"` (necessário para o Dockerfile)

## 2. Criar .dockerignore

- [x] 2.1 Criar `.dockerignore` na raiz com as entradas:
  - `node_modules/`
  - `client/node_modules/`
  - `client/dist/`
  - `.env`
  - `openspec/`
  - `docs/`
  - `mapeamento/`
  - `.git/`
  - `*.md` (exceto README.md se necessário)

## 3. Criar Dockerfile multi-stage

- [x] 3.1 Criar `Dockerfile` na raiz com stage `client-builder` baseado em `oven/bun`:
  - `WORKDIR /app/client`
  - `COPY client/package.json client/bun.lockb ./`
  - `RUN bun install --frozen-lockfile`
  - `COPY client/ .`
  - `RUN bun run build`
- [x] 3.2 Adicionar stage `server` baseado em `oven/bun`:
  - `WORKDIR /app`
  - `COPY package.json bun.lockb ./`
  - `RUN bun install --frozen-lockfile --production`
  - `COPY src/ ./src/`
  - `COPY --from=client-builder /app/client/dist ./client/dist/`
  - `EXPOSE 3001`
  - `CMD ["bun", "run", "src/application/web/server.ts"]`
- [x] 3.3 Confirmar que `docker build -t mcp-finance .` completa sem erros

## 4. Atualizar docker-compose.yml

- [x] 4.1 Adicionar serviço `api-server` ao `docker-compose.yml`:
  ```yaml
  api-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://finance:finance@postgres:5432/finance
      AI_BASE_URL: ${AI_BASE_URL}
      AI_MODEL: ${AI_MODEL}
      PORT: "3001"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
  ```
- [x] 4.2 Confirmar que `postgres` ainda tem `healthcheck` configurado (já existe, apenas verificar)

## 5. Atualizar .env.example

- [x] 5.1 Adicionar linha `PORT=3001` ao `.env.example`
- [x] 5.2 Adicionar comentário explicando que `DATABASE_URL` usa `localhost:5434` para scripts no host e que o compose sobrescreve com `postgres:5432`

## 6. Validação completa

- [x] 6.1 Executar `docker compose up --build` e verificar que ambos os serviços sobem sem erro
- [x] 6.2 Verificar que api-server aguarda postgres: no log deve aparecer a sequência postgres healthy → api-server start
- [x] 6.3 Acessar `http://localhost:3001/api/meses` e confirmar resposta JSON
- [x] 6.4 Acessar `http://localhost:3001` e confirmar que o dashboard React carrega no browser
- [x] 6.5 Testar script ETL via compose: `docker compose run --rm api-server bun run src/scripts/sync.ts` e verificar execução
- [x] 6.6 Verificar que `docker compose down` para tudo limpo e `docker compose up` (sem `--build`) reutiliza imagem existente
