# Copilot Instructions — mcp-finance

## Workflow padrão

Este projeto usa **OpenSpec** para gerenciar mudanças. Sempre usar os slash commands:

| Comando | Quando usar |
|---------|------------|
| `/opsx:propose <ideia>` | Propor uma nova change |
| `/opsx:explore <tópico>` | Explorar ideias sem implementar |
| `/opsx:apply [change-name]` | Implementar tasks de uma change |
| `/opsx:test <change-name>` | Executar testing gate de uma change |
| `/opsx:archive [change-name]` | Arquivar change concluída |

O CLI só funciona na raiz `/home/wilson/study/mcp-finance/` — nunca em subpastas.

## Testing Gate — obrigatório antes de arquivar

**Antes de qualquer `/opsx:archive`, a change deve passar pelo testing gate.**

O testing gate valida que a change funciona em ambiente limpo (Docker com volume zerado) usando dois MCPs disponíveis:

- **`postgres-finance` MCP** — queries SQL diretas ao banco
- **Browser tools VS Code** — `open_browser_page`, `screenshot_page`, `read_page`, `run_playwright_code`

**Como executar:** `/opsx:test <change-name>`

O processo completo está em [.github/instructions/testing-gate.instructions.md](.github/instructions/testing-gate.instructions.md).

## MCPs disponíveis neste projeto

```
postgres-finance   → postgres-mcp (localhost:5434/finance)
                     acesso read-only / restricted
                     usar para: assertions de schema, dados, RLS, policies

browser VS Code    → open_browser_page / screenshot_page / read_page
                     run_playwright_code / click_element
                     usar para: testar endpoints HTTP, validação visual
```

> ⚠️ NÃO usar ferramentas `mcp_io_github_chr_*` — exigem Chrome externo que não está disponível.
> Ver [.github/instructions/browser-and-mcp-tools.instructions.md](.github/instructions/browser-and-mcp-tools.instructions.md).

## Serviços e URLs

| Serviço | URL | Como subir |
|---------|-----|-----------|
| Client (Vite) | http://localhost:5173 | `bun run client:dev` |
| API server | http://localhost:3001 | `bun run web:dev` ou Docker |
| Postgres | localhost:5434 | `docker compose up postgres` |

## Validação de build

Sempre rodar `cd client && bun run build` para validar TypeScript antes de marcar tasks como concluídas.

# Usuarios para testes

# Wilson
- email:wfelipe2011@gmail.com
- password: 661879

# João
- email:joaowictor756@gmail.com
- password: 661879