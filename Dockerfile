# Stage 1: Build React client
FROM oven/bun AS client-builder

WORKDIR /app/client

COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ .
RUN bun run build

# Stage 2: Server
FROM oven/bun AS server

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY --from=client-builder /app/client/dist ./client/dist/

EXPOSE 3001

CMD ["bun", "run", "src/application/web/server.ts"]
