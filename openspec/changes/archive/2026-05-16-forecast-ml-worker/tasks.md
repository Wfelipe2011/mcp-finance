## 1. Schema — Tabelas Postgres

- [x] 1.1 Criar arquivo `src/infrastructure/db/forecast.sql` com tabela `forecast_predictions` (colunas: id, tenant_id, category_pt, group_pt, target_year, target_month, predicted_amount, lower_bound, upper_bound, model_version, status, created_at, updated_at)
- [x] 1.2 Adicionar constraint UNIQUE em `forecast_predictions(tenant_id, category_pt, target_year, target_month)`
- [x] 1.3 Criar tabela `forecast_model_meta` (colunas: id, tenant_id, trained_at, months_of_history, num_categories, mae, mape, status, error_message)
- [x] 1.4 Montar `forecast.sql` no `docker-compose.yml` como volume do Postgres (`07-forecast.sql`)

## 2. Pod Python — Dockerfile e dependências

- [x] 2.1 Criar `Dockerfile.ml-trainer` baseado em `python:3.11-slim` com instalação de `scikit-learn pandas psycopg2-binary joblib numpy schedule`
- [x] 2.2 Adicionar serviço `ml-trainer` ao `docker-compose.yml` com `ML_DATABASE_URL` (superuser), `depends_on: postgres`, `restart: always`
- [x] 2.3 Criar diretório `src/ml/` para o script Python

## 3. Script de Treinamento

- [x] 3.1 Criar `src/ml/trainer.py` com função `get_all_tenants()` que lista tenants ativos via query superuser
- [x] 3.2 Implementar `load_tenant_data(tenant_id)` que lê `cube_gastos_mensais` filtrado por tenant_id e retorna DataFrame com colunas (year, month, category_pt, group_pt, total_gastos)
- [x] 3.3 Implementar `compute_features(df)` que adiciona `mes_do_ano`, `media_3m_categoria`, `total_meses_hist` ao DataFrame
- [x] 3.4 Implementar `train_model(df_tenant)` que treina `RandomForestRegressor` (n_estimators=200, max_depth=15) com Pipeline + OneHotEncoder para category_pt e group_pt
- [x] 3.5 Implementar `generate_predictions(pipeline, df_tenant, tenant_id)` que gera predições para os próximos 3 meses por categoria e retorna lista de dicts
- [x] 3.6 Implementar `save_predictions(conn, predictions)` que faz UPSERT em `forecast_predictions`
- [x] 3.7 Implementar `save_model_meta(conn, tenant_id, meta)` que insere em `forecast_model_meta`
- [x] 3.8 Implementar `train_all_tenants()` que orquestra o ciclo completo: lista tenants → para cada tenant: carrega dados → verifica mínimo 3 meses → treina → prediz → salva
- [x] 3.9 Adicionar scheduler `schedule` para rodar `train_all_tenants()` diariamente às 00:00 BRT
- [x] 3.10 Adicionar tratamento de exceção por tenant (falha em um tenant não interrompe os outros)

## 4. Validação

- [x] 4.1 Buildar `Dockerfile.ml-trainer` e confirmar que imagem sobe sem erros
- [x] 4.2 Rodar `docker compose up ml-trainer` e verificar que o trainer conecta ao Postgres e lista tenants
- [x] 4.3 Triggerar `train_all_tenants()` manualmente e verificar rows em `forecast_predictions`
- [x] 4.4 Confirmar UPSERT: rodar duas vezes e verificar que não duplica rows
- [x] 4.5 Testar fallback: tenant com < 3 meses → `status = 'insufficient_data'` em `forecast_model_meta` e nenhuma row em `forecast_predictions`
