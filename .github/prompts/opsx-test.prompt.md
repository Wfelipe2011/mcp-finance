---
description: Executar testing gate de uma change antes de arquivar
---

Execute o testing gate para uma change — valida em ambiente Docker limpo usando postgres-mcp e browser tools.

**Input**: Especifique o nome da change após `/opsx:test` (ex: `/opsx:test multitenant-schema`). Se omitido, verificar contexto da conversa ou listar changes disponíveis.

**Siga o processo detalhado em [.github/instructions/testing-gate.instructions.md](.github/instructions/testing-gate.instructions.md)**

---

**Steps**

1. **Selecionar a change**

   Se o nome foi fornecido, usar. Caso contrário:
   - Inferir do contexto da conversa
   - Se ambíguo, rodar `openspec list --json` e perguntar ao usuário

   Anunciar: "Executando testing gate para: `<name>`"

2. **Ler as specs da change**

   ```bash
   openspec status --change "<name>" --json
   ```

   Depois ler todos os arquivos em `openspec/changes/<name>/specs/**/*.md`.

   Para cada spec, identificar as **capabilities garantidas** — o que a spec afirma que o sistema faz — e derivar uma assertion correspondente.

3. **Subir ambiente limpo**

   Executar na raiz do projeto:
   ```bash
   docker compose down -v
   docker compose up -d postgres
   ```

   Aguardar postgres ficar healthy:
   ```bash
   docker compose ps postgres
   ```

   Depois subir a API (se a change envolve endpoints HTTP):
   ```bash
   docker compose up -d api-server
   ```

4. **Executar assertions de banco (postgres-finance MCP)**

   Para cada capability de schema/RLS/dados, executar a query SQL correspondente via `postgres-finance` MCP.

   Comparar resultado com o esperado pela spec. Documentar ✓ PASS ou ✗ FAIL.

5. **Executar assertions de API e UI (browser tools VS Code)**

   Para cada capability de endpoint/auth/visual, executar usando:
   - `open_browser_page(url)` → retorna `pageId`
   - `run_playwright_code(pageId, jsCode)` → para fetch/JWT
   - `screenshot_page(pageId)` → para validação visual
   - `read_page(pageId)` → para estado da UI

   Comparar resultado com o esperado pela spec. Documentar ✓ PASS ou ✗ FAIL.

6. **Reportar resultado**

   Montar tabela de assertions com resultado de cada uma.

   **Se PASS em todas:**
   ```
   ✓ PASS — change pronta para arquivar
   Próximo passo: /opsx:archive <change-name>
   ```

   **Se FAIL em qualquer uma:**
   ```
   ✗ FAIL — não arquivar ainda
   Assertion que falhou: <descrição>
   Esperado: <valor>
   Obtido: <valor>
   ```
   Aguardar correção. Re-executar `/opsx:test <change-name>` após corrigir.

---

**Guardrails**
- NUNCA pular o ambiente limpo — `docker compose down -v` é obrigatório
- Derivar assertions das **specs da change**, não inventar testes genéricos
- Usar `postgres-finance` MCP para tudo que é SQL (schema, RLS, dados)
- Usar browser tools VS Code para tudo que é HTTP/JWT/visual — NUNCA `mcp_io_github_chr_*`
- Em caso de FAIL, parar e reportar — não tentar contornar o resultado
- O testing gate é um **portão**, não uma sugestão
