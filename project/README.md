# Project — Índice de Contextos de Explore

Pasta de planejamento estratégico do produto. Cada arquivo cobre um contexto independente com:
- Diagnóstico do estado atual
- Proposta a explorar
- Questões em aberto
- Arquivos-chave do codebase
- Referências externas

**Regra:** cada rodada de explore deve trabalhar UM arquivo. Não misturar contextos.

---

## Ordem sugerida de execução

```
Nível 1 — Infra e base (changes menores, alto impacto)
  01 → UI / Navegação DaisyUI          ← base para tudo visual
  02 → Workers Supervisor + Filas      ← simplifica infra Docker
  04 → Forecast sem ML                 ← remove complexidade, simplifica produto

Nível 2 — Produto (dependem do nível 1)
  03 → Admin no app + Roles            ← habilita onboarding e multi-usuário correto

Nível 3 — Features novas (dependem de roles e navegação)
  05 → MVP → Produto                   ← catálogo de tudo que falta
  07 → Regras de Categorização         ← independente, high value
  08 → Parcelas do Cartão              ← independente, dados já disponíveis

Nível 4 — Features avançadas (dependem de histórico acumulado)
  06 → Orçamento                       ← requer dados mínimos de meses históricos
  09 → Simulação Financeira            ← requer categorias limpas (07) + forecast SQL (04)

Nível 5 — Finalização de fluxos existentes (chat/IA)
  10 → Chat + MCP finalização          ← fecha gaps de segurança/UX do chat
  11 → Hub de IA + reorganização       ← consolida Insights/IA conforme UX Audit
```

---

## Arquivos

| # | Arquivo | Contexto | Depende de |
|---|---------|----------|-----------|
| 01 | [01-ui-navigation-daisyui.md](./01-ui-navigation-daisyui.md) | Navegação DaisyUI + Responsive + Tela Treinar no menu | — |
| 02 | [02-worker-supervisor-queues.md](./02-worker-supervisor-queues.md) | Consolidar workers + filas priorizadas (0→1→2→3) | — |
| 03 | [03-admin-in-app-roles.md](./03-admin-in-app-roles.md) | Admin dentro do app + roles (owner/member/admin) | 01 (nav) |
| 04 | [04-forecast-sem-ml.md](./04-forecast-sem-ml.md) | Remover Python ML, usar views SQL para previsão | — |
| 05 | [05-produto-evolucao.md](./05-produto-evolucao.md) | Catálogo MVP→Produto: metas, orçamento, notificações, PWA | 01, 03 |
| 06 | [06-orcamento.md](./06-orcamento.md) | Orçamento previsto vs realidade por categoria | 01, 03 |
| 07 | [07-regras-categorizacao.md](./07-regras-categorizacao.md) | Regras "se descrição contém X → categoria Y" + overrides | — |
| 08 | [08-parcelas-cartao.md](./08-parcelas-cartao.md) | Parcelas por cartão: saldo devedor real, timeline de parcelas | — |
| 09 | [09-simulacao.md](./09-simulacao.md) | Simulação financeira: nova compra + projeção meses + LLM | 04 |
| 10 | [10-chat-mcp-finalizacao.md](./10-chat-mcp-finalizacao.md) | Chat web + MCP: tenant safety, history, lazy init, role gate, streaming, ChatWidget DaisyUI | 01 (UI) |
| 11 | [11-hub-ia-reorganizacao.md](./11-hub-ia-reorganizacao.md) | UX Audit: consolida "Insights" + "IA", insight no topo do Resumo, decide papel do chat | 01, 04, 10 |

---

## Decisões confirmadas (2026-05-19)

| Decisão | Resolução |
|----------|----------|
| Forecast com ML ou SQL? | ✅ **SQL Views** — ML Python removido |
| Investimentos no Dock ou dentro de Resumo? | ✅ **Fica no Dock** — 5 itens: Resumo, Gastos, Próx., Invest., IA |
| Tela Treinar no menu? | ✅ **Removida** — sem ML, sem treinamento |

## Estado das changes abertas (hoje: 2026-05-19)

| Change | Status | Decisão |
|--------|--------|---------|
| `fix-digest-display` | EM ANDAMENTO | Continuar — pequena, arquivar logo |
| `daily-ml-insights` | EM ANDAMENTO | **Reavaliar** — UI do card diario é válida, mas parte de ML sai |
| `ml-daily-trainer` | EM ANDAMENTO | **Cancelar** — ML removido, tela Treinar removida |
| `ml-model-versioning` | VAZIA | **Cancelar** — ML removido |

---

## Links de referência rápida

### DaisyUI
- Todos os componentes: https://daisyui.com/components/
- Dock (bottom nav): https://daisyui.com/components/dock/
- Drawer (sidebar): https://daisyui.com/components/drawer/
- Tabs: https://daisyui.com/components/tab/
- Navbar: https://daisyui.com/components/navbar/
- Menu: https://daisyui.com/components/menu/
- Stat: https://daisyui.com/components/stat/
- Table: https://daisyui.com/components/table/
- Badge: https://daisyui.com/components/badge/
- Toast: https://daisyui.com/components/toast/
- Steps: https://daisyui.com/components/steps/
- Progress: https://daisyui.com/components/progress/
- Install: https://daisyui.com/docs/install/

### Tailwind
- Responsive design: https://tailwindcss.com/docs/responsive-design
- Container queries: https://tailwindcss.com/docs/responsive-design#container-queries
- Breakpoints: sm(640) md(768) lg(1024) xl(1280)

### Postgres
- Aggregate functions: https://www.postgresql.org/docs/current/functions-aggregate.html
- REGR_SLOPE, REGR_INTERCEPT, CORR para forecast sem ML

### Pluggy (Open Banking)
- Docs: https://docs.pluggy.ai/

---

## Arquivos do codebase para referência rápida

```
client/
  src/App.tsx                           ← nav atual (MUI BottomNavigation)
  src/tabs/                             ← todas as telas
  src/components/                       ← todos os componentes
  package.json                          ← deps: @tremor, recharts, tailwind (sem daisyui ainda)

src/application/
  workers/shared-worker.ts              ← worker consolidado atual (round-robin)
  workers/daily-insight-worker.ts       ← worker de insight diário
  cron/                                 ← digest-cron, forecast-cron, daily-insight-cron
  web/routes/admin/                     ← endpoints admin existentes
  web/routes/users.ts                   ← CRUD de usuários (sem role ainda)
  web/routes/chat.ts                    ← endpoint do chat (ctx 10)
  mcp/register-tools.ts                 ← carrega as 12 tools (ctx 10)

src/infrastructure/mcp/
  ChatOrchestrator.ts                   ← orquestrador (ctx 10) — hoje só delega
  McpClient.ts                          ← LangChain agent + 12 tools (ctx 10)

src/scripts/mcp.ts                      ← servidor MCP :3002 (ctx 10)

client/src/components/
  ChatWidget.tsx                        ← widget MUI (ctx 10 — migrar p/ DaisyUI)

docs/
  chat-flow.md                          ← DESATUALIZADO vs código (ctx 10)
  catalogo_mcp_12_tools.md              ← contrato das 12 tools (já em mcp-view-tools)
  Relatório de UX Audit_*.md            ← base do ctx 11

src/ml/
  trainer.py                            ← ML mensal (candidato à remoção)
  daily_trainer.py                      ← ML diário (candidato à remoção)

src/infrastructure/db/
  BunPgAdapter.ts                       ← toda a camada de dados
  forecast.sql                          ← DDLs de forecast

docker-compose.yml                      ← serviços (ml-trainer, ml-daily-trainer para remover)
```
