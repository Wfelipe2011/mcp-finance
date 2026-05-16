## Context

O projeto usa Bun como runtime, React + Vite para o client e PostgreSQL como banco. O `docker-compose.yml` atual já tem o serviço `postgres` com healthcheck. Os scripts ETL (`sync`, `enrich`, `digest`) são one-shot e não precisam ficar em execução contínua — o usuário os roda manualmente quando necessário.

A imagem `oven/bun` é a base oficial para projetos Bun. O build do client React usa Node/Bun indiferentemente — Bun consegue rodar `vite build` sem Node instalado.

## Goals / Non-Goals

**Goals:**
- `docker compose up` sobe postgres + api-server sem pré-requisitos no host
- api-server aguarda postgres estar healthy antes de iniciar
- Client React já buildado dentro da imagem — server serve `client/dist/` como arquivos estáticos
- Variáveis de ambiente injetadas via `docker-compose.yml` com fallback em `.env`
- Scripts ETL ainda executáveis via `docker compose run --rm api-server bun run src/scripts/sync.ts`

**Non-Goals:**
- Hot reload / desenvolvimento dentro do container (Docker é para produto final)
- Nginx como proxy reverso (Bun server é suficiente para uso local)
- Orquestração em produção (Kubernetes, ECS, etc.)
- Certificados TLS
- Volumes para `client/dist/` (bundle está dentro da imagem)

## Decisions

### D1: Multi-stage Dockerfile — build do client no stage 1, server no stage 2

**Decisão**:
```
Stage 1 (client-builder): oven/bun
  WORKDIR /app/client
  COPY client/package.json .
  RUN bun install --frozen-lockfile
  COPY client/ .
  RUN bun run build          → gera /app/client/dist

Stage 2 (server): oven/bun
  WORKDIR /app
  COPY package.json .
  RUN bun install --frozen-lockfile --production
  COPY src/ ./src/
  COPY --from=client-builder /app/client/dist ./client/dist/
  EXPOSE 3001
  CMD ["bun", "run", "src/application/web/server.ts"]
```

**Rationale**: `client/dist/` nunca entra no git nem no contexto de build do host. A imagem final é self-contained. O stage 1 pode ser cacheado pelo Docker quando `client/package.json` não muda.

**Alternativa descartada**: build do client no host antes do `docker compose up`. Cria dependência de Bun/Node no host e `client/dist/` precisaria estar no repositório ou ser gerado como pré-requisito manual.

### D2: DATABASE_URL com hostname `postgres` dentro do compose

**Decisão**: O serviço `api-server` recebe `DATABASE_URL=postgres://finance:finance@postgres:5432/finance` via variável de ambiente no compose. O `.env` do host mantém `localhost:5434` para os scripts rodando fora do container.

**Rationale**: Dentro da rede Docker Compose, containers se resolvem pelo nome do serviço. `localhost` não funciona entre containers.

**Separação**:
```
Host (scripts ETL):   DATABASE_URL=postgres://...@localhost:5434/finance
Container api-server: DATABASE_URL=postgres://...@postgres:5432/finance
```

### D3: Porta 3001 exposta no compose

**Decisão**: `ports: ["3001:3001"]` — sem proxy. Usuário acessa `http://localhost:3001`.

**Rationale**: Uso local, sem TLS, sem autenticação. Nginx adicionaria complexidade sem benefício.

### D4: Scripts ETL via `docker compose run`

**Decisão**: Scripts não têm serviço dedicado. Para rodar dentro do container:
```bash
docker compose run --rm api-server bun run src/scripts/sync.ts
```
Para rodar no host (alternativa mais simples, já funciona):
```bash
bun run sync
```

**Rationale**: Scripts são ferramentas de manutenção, não serviços. `docker compose run` reutiliza a imagem construída sem criar um serviço adicional.

### D5: .dockerignore exclui node_modules e client/dist

**Decisão**: `.dockerignore` exclui `node_modules/`, `client/node_modules/`, `client/dist/`, `.env`, `openspec/`, `docs/`, `mapeamento/`.

**Rationale**: Contexto de build menor = push/pull mais rápido. `node_modules` nunca devem entrar no contexto — o Dockerfile instala dependências dentro do container.

### D6: `depends_on` com condition `service_healthy`

**Decisão**: `api-server` usa `depends_on: { postgres: { condition: service_healthy } }`. O healthcheck já existe no compose atual.

**Rationale**: Sem isso, o Bun server pode tentar conectar ao PostgreSQL antes do banco estar pronto, causando erro na inicialização.

## Risks / Trade-offs

- **[Risk] Cache do Docker invalidado ao mudar qualquer arquivo em `src/`** → Mitigação: ordem das instruções COPY no Dockerfile (dependências antes do código) maximiza o cache de `bun install`
- **[Risk] `bun install --frozen-lockfile` falha se `bun.lock` não existir** → Mitigação: tarefas incluem `bun install` (sem frozen) na raiz e em `client/` para garantir que os lockfiles existam antes do build da imagem
- **[Risk] AI_BASE_URL aponta para IP da rede local (192.168.0.x)** → Mitigação: container usa `network_mode` padrão bridge — consegue acessar IPs da rede local sem configuração extra. Documentar no README que o Ollama precisa estar acessível na rede

## Open Questions

- Nenhuma — decisões tomadas no explore anterior.
