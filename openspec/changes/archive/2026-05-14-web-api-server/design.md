## Context

O projeto usa Bun como runtime em todos os scripts existentes (`sync.ts`, `enrich.ts`, `digest.ts`). O `BunPgAdapter` já encapsula todas as queries ao PostgreSQL via views Gold/Silver. A camada de aplicação web será criada em `src/application/web/`, seguindo a estrutura de pastas existente em `src/application/`.

O client React (próxima mudança) será buildado para `client/dist/`. O Bun server precisa servir esses arquivos estáticos em produção, e em dev o Vite serve o client diretamente com proxy para `/api/*`.

## Goals / Non-Goals

**Goals:**
- Expor 10 endpoints JSON cobrindo todos os dados necessários para o dashboard
- Servir arquivos estáticos de `client/dist/` (SPA fallback para rotas não-API)
- Estrutura de rotas modular e fácil de estender
- Resposta em < 200ms para todas as queries (dados vêm de views já materializadas)
- Tratamento de erros com JSON `{ error: string }` e status HTTP adequado

**Non-Goals:**
- Autenticação ou autorização
- Cache (dados já são views — PostgreSQL cuida da performance)
- WebSocket / SSE
- Paginação cursor (apenas limit/offset simples para `/api/transacoes`)
- Middleware framework (sem Express, sem Hono)

## Decisions

### D1: Bun.serve() nativo em vez de framework HTTP

**Decisão**: Usar `Bun.serve()` com dispatcher manual baseado em `URL.pathname`.

**Alternativas consideradas**:
- `Hono` — bom framework, mas adiciona dependência sem benefício real para 10 endpoints estáticos
- `Express` — não tem suporte nativo Bun optimizado, usa camada de compatibilidade Node

**Rationale**: O projeto já usa Bun nativo em todo lugar. 10 endpoints estáticos não precisam de roteamento dinâmico sofisticado. O dispatcher é ~40 linhas e elimina uma dependência.

### D2: Estrutura de rotas como módulos separados

**Decisão**: Cada domínio tem seu próprio arquivo em `src/application/web/routes/`.

```
routes/
  cashflow.ts        → /api/cashflow, /api/cashflow/projetado
  gastos.ts          → /api/gastos
  compromissos.ts    → /api/compromissos
  runway.ts          → /api/runway
  patrimonio.ts      → /api/patrimonio
  investimentos.ts   → /api/investimentos
  digest.ts          → /api/digest
  transacoes.ts      → /api/transacoes
  meses.ts           → /api/meses
```

Cada módulo exporta `handler(req: Request, url: URL): Promise<Response>`.

### D3: BunPgAdapter reutilizado — novos métodos adicionados

**Decisão**: Adicionar métodos ao `BunPgAdapter` existente para cada endpoint, usando as views já existentes.

**Rationale**: O adapter já existe e gerencia o pool de conexões. Criar um segundo adapter seria duplicação. Os novos métodos seguem o mesmo padrão dos existentes.

### D4: Formato de mês como `YYYY-MM` nos query params

**Decisão**: Parâmetro `month` sempre no formato `YYYY-MM` (ex: `2025-03`). O server faz parse para `year` e `month` separados antes de passar ao adapter.

**Validação**: Se o formato for inválido, retorna `400 { error: "Invalid month format. Use YYYY-MM" }`.

### D5: SPA fallback para client/dist

**Decisão**: Rotas que não começam com `/api/` tentam servir arquivo estático de `client/dist/`; se não encontrar, servem `client/dist/index.html`.

**Rationale**: Permite que o React Router funcione com navegação direta para qualquer URL.

## Risks / Trade-offs

- **[Risk] BunPgAdapter cresce muito** → Mitigação: os novos métodos são queries simples em views; nenhuma lógica de negócio. Se crescer demais, extrai repositórios separados em iteração futura.
- **[Risk] client/dist ausente em dev** → Mitigação: se a pasta não existir, o static handler retorna 404 com mensagem `"Run 'bun run client:build' first"`. Em dev, Vite serve o client separadamente.
- **[Risk] Query params inválidos causam erro SQL** → Mitigação: validação de `month` no router antes de chegar ao adapter. Outros params com `parseInt()` e fallback para defaults razoáveis.

## Open Questions

- Nenhuma em aberto — escopo bem definido pelo explore anterior.
