# mcp-finance

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

---

## Análise de Dados com Copilot

O projeto inclui um servidor MCP (`postgres-mcp`) que permite ao GitHub Copilot Agent consultar o banco de dados financeiro diretamente.

### Pré-requisitos

1. **Instalar postgres-mcp**:
   ```bash
   pip install --user --break-system-packages postgres-mcp
   ```

2. **Subir o PostgreSQL**:
   ```bash
   docker compose up -d
   bun run sync   # sincronizar dados da Pluggy
   ```

3. **Configurar VS Code**: copiar o template e ajustar as credenciais:
   ```bash
   cp .vscode/mcp.json.example .vscode/mcp.json  # se disponível
   ```
   Ou criar `.vscode/mcp.json` manualmente (ver `design.md` do change `postgres-mcp-setup`).

### Usando o agente

No GitHub Copilot Chat em **Agent Mode**, o servidor `postgres-finance` estará disponível. Inclua o arquivo de contexto nos seus prompts para melhores resultados:

```
#file:docs/finance-context.md

Quais foram meus maiores gastos no último mês?
```

O arquivo `docs/finance-context.md` contém:
- Schema completo das 6 tabelas
- Enumerações e valores possíveis
- Queries de referência prontas
- Seção **Descobertas** para anotar padrões encontrados durante as sessões

> O agente opera em modo `restricted` (somente leitura) — não é possível alterar dados acidentalmente.
