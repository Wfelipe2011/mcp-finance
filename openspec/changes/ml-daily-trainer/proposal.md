## Why

O modelo de previsão atual opera no grão mensal (categoria × mês) e gera predições diárias via heurísticas baseadas em `daily_habit_signals` — uma VIEW agregada que não permite split treino/teste real nem avaliação de acurácia. O usuário não tem como saber se o modelo está bom, dar feedback por data específica ou re-treinar de forma iterativa. Precisamos de um trainer diário dedicado com loop de fine-tune supervisionado pelo usuário.

## What Changes

- **Novo script Python** `src/ml/daily_trainer.py` — treinador dedicado ao grão `(date, category_pt)`, independente do `trainer.py` mensal existente
- **Split 80/20 estratificado por categoria** — cada categoria é dividida aleatoriamente em 80% treino e 20% teste, garantindo que todas as categorias apareçam nos dois conjuntos
- **Persistência versionada de modelos** — modelos `.pkl` salvos em volume Docker `/models/{tenant_id}/{version}.pkl`, com registro no banco em `forecast_model_versions`
- **Tabela `forecast_daily_test_results`** — armazena o conjunto de teste (previsto × real × desvio) para visualização ordenada por desvio
- **Tabela `forecast_category_exclusions`** — permite excluir categorias inteiras do treinamento (ex: Transferências) que não devem gerar previsões
- **Tabela `forecast_daily_exclusions`** — exclui pares `(date, category)` específicos marcados como atípicos via 👎
- **API de treino diário** — endpoints para disparar treino, listar versões, ver resultados de teste, gerenciar exclusões, ativar/arquivar versões e deletar `.pkl`
- **Navegação IA unificada** — "Previsão" e "🧠 Treinar" saem do bottom nav e entram em uma tela dedicada `/ia` com sub-abas próprias (Insights · Previsões · Treinar)
- **Card de insights navegável** — setas ◀▶ para navegar entre dias com `forecast_ai_messages` geradas; dias passados mostram real × previsto; dias futuros mostram previsão + probabilidade

## Capabilities

### New Capabilities

- `daily-ml-trainer`: Script Python dedicado ao treinamento diário com split estratificado, persistência `.pkl` versionada e geração de test-results
- `forecast-model-versions`: Tabela de versões do modelo com status `staging | production | archived`, metadados de acurácia e referência ao arquivo `.pkl`
- `forecast-daily-test-results`: Tabela com o conjunto de teste do último treinamento, ordenável por `|deviation_pct|` desc para feedback do usuário
- `forecast-category-exclusions`: Gerenciamento de categorias excluídas do treinamento por tenant (persistência em banco, UI de toggle)
- `forecast-daily-exclusions`: Exclusões de pares `(date, category)` específicos via feedback 👎 na tela de treinamento
- `ia-screen`: Tela dedicada `/ia` no menu principal substituindo as abas "Previsão" e "🧠 Treinar", com sub-abas Insights · Previsões · Treinar
- `daily-insights-navigator`: Card navegável com setas para dias com mensagem LLM gerada, exibindo contexto adequado por tipo de dia (passado/presente/futuro)

### Modified Capabilities

- `forecast-tab-ui`: Tela de previsão incorporada como sub-aba dentro da nova tela IA (mudança de posição no menu, não de comportamento)
- `forecast-ml-training`: Modelo diário passa a usar `daily_trainer.py` separado; modelo mensal existente (`trainer.py`) não é alterado

## Impact

- **Docker**: novo `Dockerfile.ml-daily` e serviço `ml-daily-trainer` no `docker-compose.yml`; novo volume nomeado `ml_models`
- **DB**: 4 novas tabelas (`forecast_model_versions`, `forecast_daily_test_results`, `forecast_category_exclusions`, `forecast_daily_exclusions`); coluna `model_version` em `forecast_daily_predictions` já existe
- **API** (`src/application/web/`): ~7 novos endpoints em `/api/forecast/daily/`
- **Frontend** (`client/src/`): Bottom nav reduz de 7 para 6 itens; novo arquivo `IaScreen.tsx` com sub-abas; `DailyInsightCard` ganha navegação ◀▶; `Treinar.tsx` refatorado para treino diário
- **Modelo mensal existente**: sem alteração
