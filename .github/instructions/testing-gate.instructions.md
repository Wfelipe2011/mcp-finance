---
description: "Processo de testing gate — executar antes de arquivar qualquer change. Cobre Docker clean, derivação de testes a partir das specs, e execução com postgres-mcp e browser tools."
---

# Testing Gate — mcp-finance

Execute antes de `/opsx:archive`. Valida a change em ambiente limpo.

## 1. Ambiente limpo (Docker com volume zerado)

```bash
# Na raiz do projeto
docker compose down -v          # remove containers E volumes (banco zerado)
docker compose up -d postgres   # sobe só o banco (schemas re-aplicados via initdb)
```

Aguardar o postgres ficar healthy:
```bash
docker compose ps postgres      # checar status = "healthy"
```

Depois subir a API:
```bash
docker compose up -d api-server
```

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

## 3. Assertions com postgres-finance MCP

### Verificar tabela existe com colunas certas
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '<tabela>'
ORDER BY ordinal_position;
```

### Verificar RLS habilitado
```sql
-- Deve retornar zero linhas (todas as tabelas de dados com RLS ativo)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('tenants', 'workers', 'enrich_jobs', 'schema_migrations');
```

### Verificar policies existem
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Verificar tenant_id presente em tabelas de dados
```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

### Verificar FK constraints
```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

## 4. Assertions com browser tools VS Code

### Testar endpoint HTTP
```javascript
// via run_playwright_code(pageId, code)
const res = await fetch('http://localhost:3001/api/health');
const json = await res.json();
console.log(res.status, JSON.stringify(json));
```

### Testar autenticação e JWT
```javascript
// POST login
const res = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '<email>', password: '<password>' })
});
const { token } = await res.json();

// Decodificar payload do JWT (sem verificar assinatura)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(JSON.stringify(payload));
// Verificar: payload.tenant_id existe
```

### Testar rota protegida sem token
```javascript
const res = await fetch('http://localhost:3001/api/sync');
console.log(res.status); // Esperado: 401
```

### Testar rota protegida com token
```javascript
const res = await fetch('http://localhost:3001/api/sync', {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log(res.status); // Esperado: 200
```

### Validação visual (UI)
```
1. open_browser_page("http://localhost:5173") → pageId
2. screenshot_page(pageId)                    → inspecionar visualmente
3. read_page(pageId)                          → ler árvore a11y
```

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
