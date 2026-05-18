## 1. System Prompt — forecastAgent.ts

- [x] 1.1 Em `src/infrastructure/ai/forecastAgent.ts`, substituir o `SystemMessage` de `generateDailyInsightMessage()` pelo prompt em inglês com persona de especialista financeiro: "You are a personal finance advisor specialized in Brazilian household spending patterns. You apply behavioral economics to give short, actionable guidance. Rules: identify the specific category and reference its average amount (R$); connect the pattern to day-of-week or frequency when relevant; suggest ONE concrete action the user can take today; tone: direct, non-judgmental, specific. ALWAYS respond in Brazilian Portuguese (pt-BR). MAXIMUM 2 sentences. NO greetings or sign-offs."

## 2. Backend — Endpoint de regeneração

- [x] 2.1 Em `src/application/web/routes/forecast/daily.ts`, adicionar handler `POST` `handleForecastDailyRegenerate(req, tenantId, sql)`: chamar `getDailyHabitSignals(today)` + `getDailyPrediction(today)`, filtrar candidatos com `probability >= 0.3 AND occurrences_6m >= 3`, retornar 409 se nenhum candidato encontrado; caso contrário selecionar top categoria, montar context idêntico ao `daily-insight-worker.ts`, chamar `generateDailyInsightMessage(context)`, fazer UPSERT via `saveDailyInsightMessage`, montar e retornar o payload completo (mesmo shape de `GET /api/forecast/daily`) com status 200
- [x] 2.2 Em `src/application/web/router.ts`, registrar rota `POST /api/forecast/daily/regenerate` apontando para `handleForecastDailyRegenerate`, com o mesmo middleware de autenticação das demais rotas de forecast

## 3. Frontend — Componente compartilhado DailyInsightCard

- [x] 3.1 Criar `client/src/components/DailyInsightCard.tsx` extraindo o componente `DailyInsightCard` de `client/src/tabs/Previsao.tsx` (incluindo a prop `insight: DailyInsight` e toda a lógica de renderização: chip de categoria, Typography de mensagem, LinearProgress de probabilidade, Typography de estimativa com range, lista de secondary_insights)
- [x] 3.2 Em `client/src/tabs/Previsao.tsx`, remover a definição local de `DailyInsightCard` e importar de `"../components/DailyInsightCard.tsx"` — verificar que a aba Previsões continua funcionando sem alteração visual

## 4. Frontend — Enriquecimento do DailyInsightsNavigator

- [x] 4.1 Em `client/src/components/DailyInsightsNavigator.tsx`, atualizar o tipo do estado `msg` em `MessageContent` para incluir todos os campos de `DailyInsight` (`category_pt`, `probability`, `estimated_amount`, `lower_bound`, `upper_bound`, `secondary_insights`); importar `DailyInsight` de `"../api/types.ts"`
- [x] 4.2 Em `MessageContent`, substituir a renderização manual (chip + Typography simples) por `<DailyInsightCard insight={{ ...msg, has_insight: true }} />` quando `msg` estiver disponível; manter a exibição do label de data (Hoje/Ontem/Histórico/Previsão) acima do card usando um chip separado externo ao DailyInsightCard
- [x] 4.3 Adicionar botão "Regerar" ao `DailyInsightsNavigator`: renderizar só quando `currentDate === todayStr`; ao clicar, chamar `POST /api/forecast/daily/regenerate` (adicionar `regenerateDailyInsight()` em `client/src/api/client.ts`); durante loading, botão fica `disabled` com CircularProgress size=16; ao receber resposta 200, atualizar o estado do `MessageContent` com os novos dados; ao receber erro 409, exibir Typography de erro "Sem previsões disponíveis para hoje"

## 5. Validação

- [x] 5.1 Rodar `cd client && bun run build` e confirmar zero erros de TypeScript
- [x] 5.2 Verificar via `curl -X POST http://localhost:3001/api/forecast/daily/regenerate -H "Authorization: Bearer <token>"` que o endpoint responde 200 com payload rico ou 409 quando sem predições
- [x] 5.3 Abrir `http://localhost:5173` na aba IA → Insights, navegar até "Hoje" e confirmar: card enriquecido com categoria + probabilidade + estimativa + secundários; botão "Regerar" visível; ao clicar, card atualiza com nova mensagem
- [x] 5.4 Navegar para datas passadas/futuras no Navigator e confirmar que o botão "Regerar" não aparece
- [x] 5.5 Verificar que aba Previsões continua exibindo DailyInsightCard normalmente após a extração do componente
