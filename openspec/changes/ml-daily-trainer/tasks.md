## 1. Banco de dados — novas tabelas

- [x] 1.1 Criar tabela `forecast_model_versions` em `src/infrastructure/db/forecast.sql`: campos `id, tenant_id, version_name, file_path (nullable), status CHECK ('staging','production','archived'), mae, mape, accuracy_pct, num_train, num_test, exclusions_applied JSONB, created_at, activated_at, archived_at`; índice em `(tenant_id, status)`; RLS + GRANT finance
- [x] 1.2 Criar tabela `forecast_daily_test_results` em `src/infrastructure/db/forecast.sql`: campos `id, tenant_id, version_name, transaction_date DATE, category_pt, group_pt, predicted_amount, actual_amount, deviation_pct`; índice em `(tenant_id, version_name, ABS(deviation_pct) DESC)`; RLS + GRANT finance
- [x] 1.3 Criar tabela `forecast_category_exclusions` em `src/infrastructure/db/forecast.sql`: campos `id, tenant_id, category_pt, created_at`; UNIQUE `(tenant_id, category_pt)`; RLS + GRANT finance
- [x] 1.4 Criar tabela `forecast_daily_exclusions` em `src/infrastructure/db/forecast.sql`: campos `id, tenant_id, transaction_date DATE, category_pt, correction_tag (nullable) CHECK ('Viagem','Evento especial','Mudança de hábito','Outra situação atípica'), created_at`; UNIQUE `(tenant_id, transaction_date, category_pt)`; RLS + GRANT finance

## 2. Infraestrutura Docker

- [x] 2.1 Criar `Dockerfile.ml-daily` baseado em `python:3.11-slim` com dependências `scikit-learn pandas psycopg2-binary joblib numpy schedule` e `CMD ["python", "daily_trainer.py"]`
- [x] 2.2 Adicionar volume nomeado `ml_models` ao `docker-compose.yml` e serviço `ml-daily-trainer` com `dockerfile: Dockerfile.ml-daily`, volume `ml_models:/models`, env `ML_DATABASE_URL` e `MODEL_STORAGE_PATH=/models`
- [x] 2.3 Montar o mesmo volume `ml_models:/models` no serviço `api-server` para que a API possa deletar arquivos `.pkl` e verificar tamanhos

## 3. Trainer Python diário

- [x] 3.1 Criar `src/ml/daily_trainer.py` com função `load_daily_dataset(tenant_id)`: query em `transactions_enriched JOIN tenant_members` agrupando por `(date, category_pt, group_pt)`, `SUM(ABS(amount))` onde `amount < 0`, excluindo categorias de `forecast_category_exclusions`
- [x] 3.2 Implementar `compute_daily_features(df)`: adicionar colunas `day_of_week, day_of_month, month_of_year`; calcular `rolling_7d_avg` e `rolling_30d_avg` por categoria (ordenado por data); calcular `days_since_last` por categoria
- [x] 3.3 Implementar `stratified_split(df)`: para cada categoria, embaralhar com `random_state=42`, reservar `max(1, int(n*0.20))` para teste; retornar `(df_train, df_test)`
- [x] 3.4 Implementar `train_daily_model(df_train)`: `Pipeline` com `ColumnTransformer` (OneHotEncoder em `category_pt, group_pt`) + `RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42)`; retornar `(pipeline, mae_train, mape_train)`
- [x] 3.5 Implementar `evaluate_model(pipeline, df_test)`: calcular `predicted_amount` para cada linha de teste; computar `deviation_pct = (predicted - actual) / actual * 100`; calcular `mae, mape, accuracy_pct` (fração com `|deviation_pct| < 30`); retornar `(metrics_dict, test_results_list)`
- [x] 3.6 Implementar `save_model_file(pipeline, tenant_id, version_name)`: `joblib.dump` em `/models/{tenant_id}/{version_name}.pkl`; criar diretório se não existir
- [x] 3.7 Implementar `save_model_version(conn, tenant_id, version_name, file_path, metrics)`: INSERT em `forecast_model_versions` com `status='staging'`
- [x] 3.8 Implementar `save_test_results(conn, tenant_id, version_name, test_results)`: UPSERT em `forecast_daily_test_results` via `execute_batch`
- [x] 3.9 Implementar `generate_daily_predictions_v2(pipeline, tenant_id, version_name, days=30)`: usando o novo modelo diário, gerar predições para os próximos 30 dias por categoria (excluindo `forecast_category_exclusions`); UPSERT em `forecast_daily_predictions` com o novo `version_name`
- [x] 3.10 Implementar `train_tenant(tenant_id)`: orquestrador que chama os passos 3.1–3.9 com tratamento de erro; mínimo de 30 dias de histórico
- [x] 3.11 Implementar loop de schedule `schedule.every().day.at("02:00")` e `run_pending` — mas também responder a sinais de trigger via arquivo sentinel `/models/{tenant_id}/.trigger` para treino sob demanda

## 4. API — endpoints de treino diário

- [x] 4.1 Criar handler `POST /api/forecast/daily/train` em `src/application/web/forecast-daily-handlers.ts`: insere job de treino (ou dispara diretamente via spawn do Python) para o `tenant_id` do JWT; retorna `{ version_name, status: 'queued' }`
- [x] 4.2 Criar handler `GET /api/forecast/daily/model-versions` em `src/application/web/forecast-daily-handlers.ts`: lista `forecast_model_versions` do tenant ordenado por `created_at DESC`; inclui tamanho do arquivo se `file_path` não for nulo
- [x] 4.3 Criar handler `GET /api/forecast/daily/test-results?version=<name>` em `src/application/web/forecast-daily-handlers.ts`: retorna `forecast_daily_test_results` para a versão solicitada, ordenados por `ABS(deviation_pct) DESC`
- [x] 4.4 Criar handler `POST /api/forecast/daily/activate` com body `{ version_name }`: atualiza status para `production`, arquiva versão anterior, enfileira geração de predições e mensagens LLM para os próximos 30 dias
- [x] 4.5 Criar handler `DELETE /api/forecast/daily/model-file` com body `{ version_name }`: valida que versão não é `production`, deleta arquivo `.pkl`, set `file_path = NULL`; retorna 409 se tentativa em `production`
- [x] 4.6 Criar handler `GET /api/forecast/daily/category-exclusions`: lista categorias do tenant com flag `excluded` baseado em `forecast_category_exclusions`
- [x] 4.7 Criar handler `POST /api/forecast/daily/category-exclusions` com body `{ category_pt, excluded: boolean }`: INSERT ou DELETE em `forecast_category_exclusions`
- [x] 4.8 Criar handler `POST /api/forecast/daily/daily-exclusions` com body `{ transaction_date, category_pt, correction_tag? }`: INSERT em `forecast_daily_exclusions`; DELETE se body incluir `{ remove: true }`
- [x] 4.9 Criar handler `GET /api/forecast/daily/messages-range`: retorna array de datas distintas em `forecast_ai_messages` para o tenant, ordenado cronologicamente; usado para navegação do card
- [x] 4.10 Registrar todos os novos handlers em `src/application/web/router.ts`

## 5. Tipos TypeScript e cliente de API

- [x] 5.1 Adicionar tipos em `client/src/api/types.ts`: `ModelVersion`, `DailyTestResult`, `CategoryExclusion`, `DailyExclusion`, `MessagesRange`
- [x] 5.2 Adicionar funções em `client/src/api/client.ts`: `fetchModelVersions()`, `fetchTestResults(versionName)`, `activateModelVersion(versionName)`, `deleteModelFile(versionName)`, `fetchCategoryExclusions()`, `toggleCategoryExclusion(categoryPt, excluded)`, `addDailyExclusion(date, categoryPt, tag?)`, `removeDailyExclusion(date, categoryPt)`, `fetchMessagesRange()`, `requestDailyTrain()`

## 6. Frontend — tela IA unificada

- [x] 6.1 Criar `client/src/tabs/IaScreen.tsx` com sub-abas: "Insights" · "Previsões" · "Treinar"; usar tabs horizontais simples com estado `activeSubTab`
- [x] 6.2 Sub-aba "Previsões" em `IaScreen.tsx`: renderizar `<Previsao />` existente sem alterações
- [x] 6.3 Sub-aba "Treinar" em `IaScreen.tsx`: renderizar novo `<TreinarDiario />` (ver task 6.5)
- [x] 6.4 Sub-aba "Insights" em `IaScreen.tsx`: renderizar novo `<DailyInsightsNavigator />` (ver task 6.8)
- [x] 6.5 Criar `client/src/components/TreinarDiario.tsx` com seções: (a) banner de status do modelo atual (versão, MAE, MAPE), (b) lista de versões com botões Ativar/Deletar .pkl, (c) gerenciador de categorias excluídas com toggles, (d) resultados do conjunto de teste com 👍/👎, (e) botões "Re-treinar" e "Iniciar novo treinamento"
- [x] 6.6 Seção de categorias excluídas em `TreinarDiario.tsx`: listar todas as categorias do tenant com toggle; persistir via `toggleCategoryExclusion()`
- [x] 6.7 Seção de test-results em `TreinarDiario.tsx`: listar resultados do 20% de teste para a versão mais recente, ordenados por `|deviation_pct|` desc; botão 👎 insere em `forecast_daily_exclusions`; indicador de cor por desvio (vermelho/amarelo/verde)
- [x] 6.8 Criar `client/src/components/DailyInsightsNavigator.tsx`: busca `fetchMessagesRange()`, exibe seta ◀ (disabled se primeiro), data formatada, conteúdo do dia, seta ▶ (disabled se último); adapta conteúdo por tipo de dia (passado/hoje/futuro)
- [x] 6.9 Atualizar `client/src/App.tsx`: remover "Previsão" e "🧠 Treinar" do bottom nav; adicionar item "IA" com ícone `AutoAwesomeRounded`; importar e renderizar `<IaScreen />`

## 7. Validação de build e integração

- [x] 7.1 Rodar `cd client && bun run build` e corrigir quaisquer erros de TypeScript
- [ ] 7.2 Verificar que `docker compose up --build ml-daily-trainer` sobe sem erros e o volume `ml_models` é criado
- [ ] 7.3 Verificar que as 4 novas tabelas existem no banco com `\dt forecast_*` via postgres-mcp
- [ ] 7.4 Verificar que `GET /api/forecast/daily/category-exclusions` retorna categorias para Wilson (tenant real)
- [ ] 7.5 Disparar treinamento via `POST /api/forecast/daily/train` e verificar que `forecast_model_versions` recebe registro com `status='staging'`
- [ ] 7.6 Verificar que o card de insights navega corretamente com setas entre datas com mensagem LLM
