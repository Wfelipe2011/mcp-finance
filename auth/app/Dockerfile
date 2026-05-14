# ── Stage 1: compilação TypeScript ───────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────
# Imagem oficial do Puppeteer — já vem com Google Chrome instalado,
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true e PUPPETEER_EXECUTABLE_PATH configurados.
FROM ghcr.io/puppeteer/puppeteer:24

WORKDIR /app

USER root

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia o build compilado do stage anterior
COPY --from=builder /app/dist ./dist

# Cria o entrypoint diretamente no container (evita problema de CRLF do Windows)
RUN printf '#!/bin/sh\nmkdir -p /app/data /app/screenshots\n[ -f /app/data/sessions.json ] || echo "{}" > /app/data/sessions.json\nexec "$@"\n' \
    > /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R pptruser:pptruser /app

USER pptruser

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
