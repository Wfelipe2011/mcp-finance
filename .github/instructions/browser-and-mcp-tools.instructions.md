---
description: "Use when testing the client app in the browser, doing visual validation, clicking UI elements, taking screenshots, or navigating pages at localhost:5173. Also covers which browser tools work in this project vs the Chrome DevTools MCP."
---
# Browser Testing & MCP Tools — mcp-finance

## Dev Server URLs

| Service | URL | Como iniciar |
|---------|-----|-------------|
| Client (Vite) | http://localhost:5173 | `cd client && bun run dev` ou `bun run client:dev` |
| API server | http://localhost:3001 | `bun run web:dev` (dev) ou Docker |
| Postgres | localhost:5434 | `docker compose up postgres` |

## Ferramentas de Browser — Qual usar

### ✅ Usar estas (VS Code integrado — sempre disponíveis)

Estas ferramentas funcionam **sem Chrome externo**, diretamente no browser embutido do VS Code:

- `open_browser_page(url)` — abre/navega para uma URL, retorna pageId
- `screenshot_page(pageId)` — captura screenshot visual
- `read_page(pageId)` — snapshot da árvore a11y (melhor que screenshot para ler estado)
- `click_element(pageId, element, ref?)` — clica em elemento
- `navigate_page(pageId, type, url?)` — navega (url/back/forward/reload)
- `run_playwright_code(pageId, code)` — executa JS via Playwright (ex: limpar localStorage)
- `hover_element`, `drag_element`, `handle_dialog` — interações adicionais

**Fluxo padrão para testar o app:**
```
1. open_browser_page("http://localhost:5173") → pageId
2. screenshot_page(pageId) ou read_page(pageId)
3. click_element(pageId, "description do elemento", ref?)
4. screenshot_page(pageId) para verificar resultado
```

### ❌ NÃO usar para este projeto (Chrome DevTools MCP)

As ferramentas `mcp_io_github_chr_*` (ex: `mcp_io_github_chr_new_page`, `mcp_io_github_chr_take_screenshot`) **exigem Chrome rodando com `--remote-debugging-port`** e falham com:
> "Could not connect to Chrome. Check if Chrome is running."

O MCP `io.github.ChromeDevTools/chrome-devtools-mcp` está configurado mas **não tem Chrome externo disponível** neste projeto. Não tentar usar.

## OpenSpec CLI

O `openspec` CLI é usado para gerenciar mudanças no projeto:

```bash
openspec list --json                              # listar changes ativas
openspec new change "<name>"                      # criar nova change
openspec status --change "<name>" --json          # status com artefatos
openspec instructions <artifact> --change "<name>" --json  # instruções de artefato
openspec instructions apply --change "<name>" --json       # instruções de apply
```

**Nota:** o CLI só funciona na raiz `/home/wilson/study/mcp-finance/` — não em `client/`.

## Comandos do Projeto

```bash
# Build e dev
bun run client:dev      # Vite dev server → localhost:5173
bun run client:build    # Build de produção (valida TypeScript)
cd client && bun run build  # equivalente

# Scripts de dados
bun run sync            # Sincroniza transações do Pluggy
bun run enrich          # Enriquecimento AI das transações
bun run digest --month YYYY-MM  # Gera digest mensal

# Infra
docker compose up -d    # Sobe postgres + api-server
docker compose up postgres  # Só o banco
```

## Verificação de Build

Sempre rodar `cd client && bun run build` (ou `bun run client:build`) para validar zero erros TypeScript antes de marcar tasks como concluídas.
