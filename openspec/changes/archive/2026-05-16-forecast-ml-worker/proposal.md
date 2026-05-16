## Why

O sistema atual não oferece previsão de gastos futuros — o usuário só vê o que já aconteceu. Precisamos de um worker que treine um modelo preditivo por tenant (usando histórico de transações) e salve projeções para os próximos 3 meses no Postgres, servindo como base para a aba Previsão e para as mensagens diárias de IA.

## What Changes

- Novo pod Docker `ml-trainer` (Python) rodando separado do `api-server` e `supervisor`
- Novo `Dockerfile.ml-trainer` baseado em `python:3.11-slim`
- Script `src/ml/trainer.py` que roda diariamente às 00:00 (cron interno via `schedule`)
- Treina um `RandomForestRegressor` por tenant com dados de `cube_gastos_mensais`
- Salva predições dos próximos 3 meses em tabela `forecast_predictions`
- Salva metadados do modelo (data treino, MAE, tenant_id) em `forecast_model_meta`
- Fallback: tenants com menos de 3 meses de histórico recebem `status = 'insufficient_data'`
- Modelos `.pkl` NÃO são persistidos — predições vão direto para Postgres

## Capabilities

### New Capabilities

- `forecast-ml-training`: Treinamento diário de RandomForest por tenant com histórico de gastos mensais por categoria, gerando previsões de 3 meses
- `forecast-predictions-schema`: Schema das tabelas `forecast_predictions` e `forecast_model_meta` no Postgres
- `forecast-ml-pod`: Pod Docker Python independente no docker-compose para o worker de ML

### Modified Capabilities

_(nenhuma)_

## Impact

- `docker-compose.yml`: novo serviço `ml-trainer`
- `Dockerfile.ml-trainer`: novo Dockerfile Python
- `src/ml/trainer.py`: novo script de treinamento
- `src/infrastructure/db/schema.sql` ou novo arquivo SQL: novas tabelas `forecast_predictions`, `forecast_model_meta`
- Dependências Python: `scikit-learn`, `pandas`, `psycopg2-binary`, `joblib`, `numpy`, `schedule`
- Fonte de dados: `cube_gastos_mensais` (gold layer, conexão superuser para acesso cross-tenant)
