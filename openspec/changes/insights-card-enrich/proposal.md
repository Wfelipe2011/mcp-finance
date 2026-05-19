## Why

O card de Insights (aba IA → Insights) exibe apenas o texto da mensagem gerada por IA, ignorando os dados ricos de contexto já salvos (probabilidade, estimativa de valor, categoria, insights secundários). Além disso, não há como forçar a regeneração do insight do dia sem esperar o cron das 00:30, e o system prompt do agente é básico demais para extrair o máximo de modelos locais.

## What Changes

- Novo endpoint `POST /api/forecast/daily/regenerate` — regenera o insight de hoje inline (sem job queue), buscando dados frescos do banco e chamando o LLM diretamente
- Botão "Regerar" no card de Insights, visível apenas quando a data exibida é hoje
- `MessageContent` em `DailyInsightsNavigator.tsx` enriquecido com chip de categoria, barra de probabilidade, estimativa com range e insights secundários (usando os dados que o endpoint já retorna)
- Extração de `DailyInsightCard` de `Previsao.tsx` para componente compartilhado em `components/`
- System prompt do `generateDailyInsightMessage()` reescrito em inglês com persona de especialista financeiro, mantendo respostas em pt-br

## Capabilities

### New Capabilities

- `daily-insight-regenerate`: Endpoint e UI para regeneração on-demand do insight do dia atual
- `daily-insight-card-ui`: Card enriquecido no Navigator com dados contextuais completos (probabilidade, estimativa, secundários)

### Modified Capabilities

- `forecast-ai-message-generation`: System prompt do agente atualizado (mudança de comportamento observável: mensagens mais específicas e personalizadas)

## Impact

- `src/application/web/routes/forecast/daily.ts` — adicionar handler `POST` para regenerate
- `src/application/web/router.ts` — registrar nova rota POST
- `src/infrastructure/ai/forecastAgent.ts` — reescrever system prompt de `generateDailyInsightMessage`
- `client/src/components/DailyInsightsNavigator.tsx` — enriquecer `MessageContent`, adicionar botão regerar
- `client/src/components/DailyInsightCard.tsx` — extrair de `Previsao.tsx` como componente shared
- `client/src/tabs/Previsao.tsx` — usar componente extraído
- `client/src/api/client.ts` — adicionar `regenerateDailyInsight()` 
