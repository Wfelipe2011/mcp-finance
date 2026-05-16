## Context

O `api-server` já possui padrão consolidado de rotas: handler function → `router.ts` → autenticação via Bearer token com `tenant_id` extraído do JWT. Os novos endpoints de forecast seguem o mesmo padrão dos endpoints existentes (ex: `/api/gastos`, `/api/cashflow`).

Os dados já estarão no Postgres após os workers `forecast-ml-worker` e `forecast-ai-messages` rodarem.

## Goals / Non-Goals

**Goals:**
- Expor 3 endpoints GET para consumo do cliente React
- Retornar dados combinados (predição + real) para facilitar renderização de gráficos
- Tratar graciosamente o caso sem dados (predições inexistentes)

**Non-Goals:**
- Não calcula nada no servidor — apenas lê o que foi salvo pelos workers
- Não expõe endpoints de escrita (os workers escrevem diretamente)

## Decisions

### D1: Estrutura de resposta — dados combinados real + previsto

**Escolha:** Cada endpoint retorna uma lista com `months` que inclui tanto meses passados (reais, de `cube_gastos_mensais`) quanto meses futuros (previstos, de `forecast_predictions`).

```json
// GET /api/forecast/groups
{
  "months": [
    { "year": 2026, "month": 3, "type": "real",     "group_pt": "Necessidades", "amount": 2340.50 },
    { "year": 2026, "month": 4, "type": "real",     "group_pt": "Necessidades", "amount": 2100.00 },
    { "year": 2026, "month": 5, "type": "real",     "group_pt": "Necessidades", "amount": 980.00 },
    { "year": 2026, "month": 6, "type": "forecast", "group_pt": "Necessidades", "amount": 2200.00, "lower": 1900.00, "upper": 2500.00 }
  ]
}
```

**Rationale:** A UI pode renderizar um único gráfico de área com a transição real→previsto sem processamento adicional.

### D2: Período retornado — 3 meses reais + 3 meses previstos

**Escolha:** 3 meses históricos reais + 3 meses de predição.

**Rationale:** Suficiente para contexto visual sem sobrecarregar o payload.

### D3: Endpoint `/api/forecast/message` retorna apenas a mensagem do dia

**Escolha:** Retorna `{ message_pt, message_date, has_forecast }`.

**Alternativa:** Retornar toda a série de mensagens dos últimos dias.

**Rationale:** A UI só precisa da mensagem do dia. Simples e direto.

## Risks / Trade-offs

- **Worker ainda não rodou** → Retorna `{ has_forecast: false, months: [] }` — UI trata como "sem dados ainda"
- **Modelo com poucos dados produz previsões ruins** → O `model_version` inclui MAE para transparência opcional na UI

## Migration Plan

1. Implementar handlers em `src/application/web/routes/forecast/`
2. Adicionar rotas ao `router.ts`
3. Build e validação com curl/browser

## Open Questions

_(nenhuma)_
