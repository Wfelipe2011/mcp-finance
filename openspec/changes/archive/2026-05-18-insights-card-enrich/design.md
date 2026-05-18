## Context

O `DailyInsightsNavigator` (aba IA → Insights) navega entre datas de mensagens disponíveis, mas o componente `MessageContent` só renderiza o texto bruto (`message_pt`). O endpoint `GET /api/forecast/daily?date=YYYY-MM-DD` já retorna um payload rico com `category_pt`, `probability`, `estimated_amount`, `lower_bound`, `upper_bound`, `secondary_insights` — tudo ignorado. O componente `DailyInsightCard` que consome esses campos existe em `Previsao.tsx` (aba Previsões), mas está acoplado ao arquivo.

Para regenerar o insight do dia, hoje é necessário esperar o cron das 00:30 BRT que enfileira um job no `daily-insight-worker`. Não há como forçar a regeneração sem acesso ao banco diretamente.

O `generateDailyInsightMessage()` em `forecastAgent.ts` usa um system prompt em português que é verboso e não ativa os "instintos de especialista financeiro" do modelo local de forma eficaz.

## Goals / Non-Goals

**Goals:**
- Enriquecer o card de Insights com todos os dados que o endpoint já retorna
- Permitir regeneração do insight de hoje on-demand via botão na UI
- System prompt mais eficaz para modelos GGUF locais (instrução em inglês, resposta em pt-br)
- Extrair `DailyInsightCard` como componente shared reutilizável

**Non-Goals:**
- Regenerar insights de datas passadas ou futuras
- Websocket / polling para saber quando regeneração terminou (resposta síncrona é suficiente)
- Mudar o formato ou schema do banco de dados
- Alterar o fluxo de geração automática do cron

## Decisions

### Decisão 1: Regeneração síncrona no handler HTTP (não via job queue)

**Escolhido**: handler `POST /api/forecast/daily/regenerate` chama `getDailyHabitSignals` + `getDailyPrediction` + `generateDailyInsightMessage` + `saveDailyInsightMessage` diretamente, retornando o novo payload no response.

**Alternativa descartada**: enfileirar job e retornar 202 com polling. Mais complexo, delay imprevisível.

**Rationale**: o LLM local (`192.168.0.177:8080`) tipicamente responde em 2-5s. O handler tem tempo suficiente. O UPSERT garante idempotência — se o cron rodou antes, regenerar sobrescreve com dados frescos. Mesma lógica do `daily-insight-worker.ts`, extraída como função compartilhada.

### Decisão 2: Extrair DailyInsightCard para componente shared

**Escolhido**: mover o `DailyInsightCard` de `Previsao.tsx` para `client/src/components/DailyInsightCard.tsx`. `Previsao.tsx` e `DailyInsightsNavigator.tsx` importam o componente compartilhado.

**Rationale**: evita duplicação. O componente já tem toda a lógica de exibição (chip, barra de probabilidade, range, secundários) — só precisamos reutilizá-lo.

### Decisão 3: MessageContent substituído por DailyInsightCard

**Escolhido**: `DailyInsightsNavigator.tsx` usa `DailyInsightCard` quando o fetch retorna dados válidos. O chip de "Hoje / Ontem / Histórico / Previsão" é adicionado ao card via prop `dateLabel`.

**Rationale**: o endpoint já retorna `has_insight`, `category_pt`, `probability`, etc. Nenhuma mudança de API necessária.

### Decisão 4: System prompt em inglês para generateDailyInsightMessage

**Escolhido**: system prompt reescrito em inglês com persona de especialista financeiro + instrução explícita de responder em pt-br.

```
You are a personal finance advisor specialized in Brazilian household spending 
patterns. You apply behavioral economics to give short, actionable guidance.

Rules:
- Identify the specific category and reference its average amount (R$)
- Connect the pattern to day-of-week or frequency when relevant
- Suggest ONE concrete action the user can take today
- Tone: direct, non-judgmental, specific

ALWAYS respond in Brazilian Portuguese (pt-BR).
MAXIMUM 2 sentences. NO greetings or sign-offs.
```

**Rationale**: modelos GGUF treinados primariamente em inglês entendem instruções de comportamento melhor em inglês. A instrução `"respond in pt-BR"` mantém a saída localizada.

### Decisão 5: Botão "Regerar" só visível para "Hoje"

A função `isDayPast` / `isDayFuture` já existe no Navigator. O botão aparece só quando `currentDate === todayStr`. Durante o loading, o botão fica disabled com spinner. Após a resposta, o card re-renderiza com os novos dados.

## Risks / Trade-offs

- **[Timeout]** LLM local pode demorar >30s → Mitigação: timeout de 30s no handler com mensagem de erro amigável na UI
- **[Sem predições]** Se não há `forecast_daily_predictions` para hoje, não há o que regenerar → Mitigação: handler retorna 409 com mensagem "Sem previsões disponíveis para hoje"; UI exibe toast
- **[System prompt]** Mudança de prompt pode gerar respostas diferentes para todos os usuários desde a próxima execução do cron → esperado e desejável; sem rollback necessário
- **[Duplicação temporária]** Durante a migração, `DailyInsightCard` vive em dois lugares até `Previsao.tsx` ser atualizado → resolvido na mesma task
