## ADDED Requirements

### Requirement: Script de treinamento diário independente
O sistema SHALL fornecer um script Python `src/ml/daily_trainer.py` dedicado ao treinamento de modelo probabilístico no grão `(date, category_pt)`, completamente independente do `trainer.py` mensal existente.

#### Scenario: Carregamento de dados históricos completos
- **WHEN** o trainer executa para um tenant
- **THEN** carrega todas as transações de `transactions_enriched` agrupadas por `(date, category_pt)` sem limite de período, filtrando `amount < 0` e excluindo categorias presentes em `forecast_category_exclusions`

#### Scenario: Engenharia de features diárias
- **WHEN** o dataset histórico é carregado
- **THEN** o trainer computa features: `day_of_week` (0-6), `day_of_month` (1-31), `month_of_year` (1-12), `rolling_7d_avg` por categoria, `rolling_30d_avg` por categoria, `days_since_last_occurrence` por categoria

#### Scenario: Split estratificado por categoria
- **WHEN** o trainer realiza o split treino/teste
- **THEN** para cada categoria, embaralha suas linhas com `random_state=42` e reserva `max(1, int(n * 0.20))` linhas para o conjunto de teste, garantindo que todas as categorias apareçam em ambos os conjuntos

#### Scenario: Mínimo de dados para treino
- **WHEN** um tenant tem menos de 30 dias de histórico com transações
- **THEN** o trainer registra status `'insufficient_data'` em `forecast_model_versions` e não gera arquivo `.pkl`

#### Scenario: Persistência do modelo treinado
- **WHEN** o treinamento é concluído com sucesso
- **THEN** o pipeline serializado é salvo em `/models/{tenant_id}/daily-v{YYYYMMDD}-{HHMMSS}.pkl` via `joblib.dump` e o registro correspondente é criado em `forecast_model_versions` com status `'staging'`

#### Scenario: Registro de metadados de acurácia
- **WHEN** o modelo é avaliado no conjunto de teste
- **THEN** `forecast_model_versions` recebe `mae`, `mape`, `accuracy_pct` (fração de predições dentro de ±30% do valor real), `num_train`, `num_test` e `exclusions_applied` (lista de categorias excluídas)

#### Scenario: Salvamento dos resultados do conjunto de teste
- **WHEN** o treinamento é concluído com sucesso
- **THEN** todos os pares do conjunto de teste com `predicted_amount`, `actual_amount` e `deviation_pct` são salvos em `forecast_daily_test_results` associados ao `version_name`

#### Scenario: Container dedicado
- **WHEN** o docker-compose é iniciado
- **THEN** o serviço `ml-daily-trainer` usa `Dockerfile.ml-daily`, monta o volume `ml_models:/models` e tem acesso a `ML_DATABASE_URL`
