---
description: "Processo de testing gate — executar antes de arquivar qualquer change. Cobre Docker clean, derivação de testes a partir das specs, e execução com postgres-mcp e browser tools."
---

# Testing Gate — mcp-finance

Execute antes de `/opsx:archive`. Valida a change.

> ⚠️ `down -v` destrói todos os dados. Só executar quando o ambiente de teste não tiver dados que precisam ser preservados.

## 2. Derivar casos de teste das specs

Para cada change, ler os arquivos de spec em:
```
openspec/changes/<name>/specs/**/*.md
```

Para cada spec, identificar as **capabilities garantidas** — o que a spec afirma que o sistema faz. Derivar uma assertion por capability, classificada em:

| Tipo | Ferramenta |
|------|-----------|
| Schema SQL (tabelas, colunas, índices) | `postgres-finance` MCP |
| RLS, policies, rowsecurity | `postgres-finance` MCP |
| Dados inseridos / seeds | `postgres-finance` MCP |
| Endpoints HTTP (auth, response body) | browser VS Code |
| Validação visual / UI | browser VS Code (`screenshot_page`) |
| JWT payload / localStorage | browser VS Code (`run_playwright_code`) |


## 5. Critério de PASS / FAIL

**PASS** — todos os casos de teste produzem o resultado esperado:
- Queries SQL retornam as linhas/colunas esperadas
- Endpoints retornam os status codes corretos
- JWT contém os campos esperados
- UI renderiza sem erros

**FAIL** — qualquer assertion falha:
- Parar o teste
- Reportar qual assertion falhou e o resultado obtido vs esperado
- NÃO prosseguir para `/opsx:archive`
- Aguardar correção e re-executar o testing gate

## 6. Output esperado do testing gate

```
## Testing Gate — <change-name>

**Ambiente:** Docker clean (volume zerado) ✓
**Banco:** healthy ✓

### Assertions

| # | Ferramenta | O que verifica | Resultado |
|---|-----------|---------------|-----------|
| 1 | postgres-mcp | tabela `tenants` existe com 9 colunas | ✓ PASS |
| 2 | postgres-mcp | RLS ativo em todas as tabelas de dados | ✓ PASS |
| 3 | browser | POST /api/auth/login retorna JWT | ✓ PASS |
| 4 | browser | JWT contém tenant_id | ✓ PASS |
| 5 | browser | GET /api/sync sem token retorna 401 | ✓ PASS |

**Resultado: ✓ PASS — change pronta para arquivar**

Próximo passo: `/opsx:archive <change-name>`
```
